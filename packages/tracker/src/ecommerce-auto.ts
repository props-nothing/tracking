/**
 * Auto-detect e-commerce events from popular platforms
 * (WooCommerce, Shopify) without requiring manual JS integration.
 *
 * Fires the same event payload as window.tracking.ecommerce() so the
 * data flows through the existing collect → events pipeline.
 */
import { EventPayload } from './collect';
import { createEcommercePayload, EcommerceData } from './ecommerce';
import { debug as log } from './utils';

let debugMode = false;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Extract product data from WooCommerce's JSON-LD structured data */
function getWooProductFromJsonLd(): { id: string; name: string; price: number; category?: string } | null {
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      const json = JSON.parse(script.textContent || '');
      const item = json['@type'] === 'Product' ? json : (Array.isArray(json['@graph']) ? json['@graph'].find((n: any) => n['@type'] === 'Product') : null);
      if (item) {
        const price = item.offers?.price ?? item.offers?.[0]?.price ?? 0;
        return {
          id: item.sku || item.productID || item['@id'] || '',
          name: item.name || '',
          price: parseFloat(price) || 0,
          category: item.category || undefined,
        };
      }
    }
  } catch { /* ignore */ }
  return null;
}

/** Extract product data from WooCommerce form data attributes */
function getWooProductFromForm(form: HTMLFormElement): { id: string; name: string; price: number; category?: string } | null {
  try {
    const productId = form.querySelector<HTMLInputElement>('button[name="add-to-cart"], input[name="add-to-cart"]')?.value
      || form.getAttribute('data-product_id')
      || '';
    const name = document.querySelector<HTMLElement>('.product_title, h1.entry-title')?.textContent?.trim() || '';
    // Try to get price from WooCommerce price element
    const priceEl = document.querySelector('.product .price .woocommerce-Price-amount, .product .price ins .woocommerce-Price-amount, .summary .price .woocommerce-Price-amount');
    let price = 0;
    if (priceEl) {
      const priceText = (priceEl.textContent || '').replace(/[^\d.,]/g, '').replace(',', '.');
      price = parseFloat(priceText) || 0;
    }
    if (productId || name) {
      return { id: productId, name, price };
    }
  } catch { /* ignore */ }
  return null;
}

/* ------------------------------------------------------------------ */
/*  WooCommerce auto-detection                                         */
/* ------------------------------------------------------------------ */

function detectWooCommerce(
  emitEvent: (payload: Partial<EventPayload>) => void
): boolean {
  // WooCommerce pages have a body class 'woocommerce' or the global wc_add_to_cart_params
  const isWoo = document.body.classList.contains('woocommerce')
    || document.body.classList.contains('woocommerce-page')
    || !!(window as any).wc_add_to_cart_params
    || !!(window as any).wc_cart_fragments_params;

  if (!isWoo) return false;
  log(debugMode, 'WooCommerce detected — attaching ecommerce listeners');

  // ── Add to cart (simple products — form submit) ────────────
  document.addEventListener('submit', (e) => {
    const form = e.target as HTMLFormElement;
    if (!form || form.tagName !== 'FORM') return;
    const addBtn = form.querySelector<HTMLButtonElement | HTMLInputElement>('button[name="add-to-cart"], input[name="add-to-cart"]');
    if (!addBtn) return;

    const product = getWooProductFromJsonLd() || getWooProductFromForm(form);
    if (!product) return;

    const qty = parseInt((form.querySelector<HTMLInputElement>('[name="quantity"]')?.value) || '1', 10) || 1;

    const payload = createEcommercePayload('add_to_cart', {
      currency: (window as any).woocommerce_params?.currency || 'EUR',
      items: [{
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: qty,
        category: product.category,
      }],
    });
    emitEvent(payload);
    log(debugMode, 'WooCommerce add_to_cart (form):', product.name, 'x', qty);
  }, true); // capture phase so we fire before navigation

  // ── Add to cart (AJAX — WooCommerce fires a jQuery event) ──
  try {
    const jq = (window as any).jQuery || (window as any).$;
    if (jq) {
      jq(document.body).on('added_to_cart', (_e: any, _fragments: any, _hash: any, btn: any) => {
        const $btn = jq(btn);
        const productId = $btn.data('product_id') || $btn.val() || '';
        const qty = parseInt($btn.data('quantity') || '1', 10) || 1;
        // Try to get product name and price from the product listing
        const $li = $btn.closest('.product, li');
        const name = $li.find('.woocommerce-loop-product__title, .product-title, h2').first().text().trim() || '';
        const priceText = ($li.find('.price ins .woocommerce-Price-amount, .price .woocommerce-Price-amount').first().text() || '')
          .replace(/[^\d.,]/g, '').replace(',', '.');
        const price = parseFloat(priceText) || 0;

        const payload = createEcommercePayload('add_to_cart', {
          currency: (window as any).woocommerce_params?.currency || 'EUR',
          items: [{ id: String(productId), name, price, quantity: qty }],
        });
        emitEvent(payload);
        log(debugMode, 'WooCommerce add_to_cart (AJAX):', name, 'x', qty);
      });

      jq(document.body).on('removed_from_cart', (_e: any, _fragments: any, _hash: any, btn: any) => {
        const $btn = jq(btn);
        const productName = $btn.closest('.cart_item, tr').find('.product-name a, td.product-name').first().text().trim() || '';
        const payload = createEcommercePayload('remove_from_cart', {
          items: [{ id: '', name: productName, price: 0, quantity: 1 }],
        });
        emitEvent(payload);
        log(debugMode, 'WooCommerce remove_from_cart:', productName);
      });
    }
  } catch { /* jQuery not available — OK, form submit still works */ }

  // ── Checkout (begin_checkout) ──────────────────────────────
  // Guard: do NOT fire begin_checkout on the order-received (thank-you) page,
  // which shares the woocommerce-checkout body class in WooCommerce.
  const isOrderReceived = document.body.classList.contains('woocommerce-order-received')
    || window.location.pathname.includes('/order-received/')
    || window.location.pathname.includes('/bestelling-ontvangen/')
    || !!document.querySelector('.woocommerce-order-overview');

  if (document.body.classList.contains('woocommerce-checkout') && !isOrderReceived) {
    emitEvent(createEcommercePayload('begin_checkout', {}));
    log(debugMode, 'WooCommerce begin_checkout');
  }

  // ── Purchase (order-received / thank-you page) ─────────────
  if (isOrderReceived) {
    try {
      // Try extracting order data from the thank-you page
      const orderEl = document.querySelector('.woocommerce-order-overview__order strong, .order strong');
      const orderId = orderEl?.textContent?.trim() || '';

      // Deduplicate: skip if this order_id was already tracked in this browser
      const purchaseKey = '_tk_pur';
      let trackedOrders: string[] = [];
      try {
        trackedOrders = JSON.parse(sessionStorage.getItem(purchaseKey) || '[]');
      } catch { /* ignore */ }

      if (orderId && trackedOrders.includes(orderId)) {
        log(debugMode, 'WooCommerce purchase already tracked, skipping:', orderId);
      } else {
        const totalEl = document.querySelector('.woocommerce-order-overview__total strong .woocommerce-Price-amount, .order-total .woocommerce-Price-amount');
        const totalText = (totalEl?.textContent || '').replace(/[^\d.,]/g, '').replace(',', '.');
        const total = parseFloat(totalText) || 0;

        // Collect ordered items from order details table
        const items: EcommerceData['items'] = [];
        document.querySelectorAll('.woocommerce-table--order-details .order_item, .woocommerce-table--order-details tbody tr').forEach((row) => {
          const nameEl = row.querySelector('.product-name');
          if (!nameEl) return;
          const name = (nameEl.textContent || '').replace(/\s*×\s*\d+/, '').trim();
          const qtyMatch = (nameEl.textContent || '').match(/×\s*(\d+)/);
          const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
          const priceEl = row.querySelector('.product-total .woocommerce-Price-amount');
          const priceText = (priceEl?.textContent || '').replace(/[^\d.,]/g, '').replace(',', '.');
          const price = parseFloat(priceText) || 0;
          items.push({ id: '', name, price: qty > 0 ? price / qty : price, quantity: qty });
        });

        const payload = createEcommercePayload('purchase', {
          order_id: orderId,
          total,
          revenue: total,
          currency: (window as any).woocommerce_params?.currency || 'EUR',
          items: items.length > 0 ? items : undefined,
        });
        emitEvent(payload);
        log(debugMode, 'WooCommerce purchase:', orderId, '€' + total);

        // Mark this order as tracked
        if (orderId) {
          try {
            trackedOrders.push(orderId);
            sessionStorage.setItem(purchaseKey, JSON.stringify(trackedOrders));
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore errors parsing thank you page */ }
  }

  return true;
}

/* ------------------------------------------------------------------ */
/*  Shopify auto-detection                                             */
/* ------------------------------------------------------------------ */

function detectShopify(
  emitEvent: (payload: Partial<EventPayload>) => void
): boolean {
  const isShopify = !!(window as any).Shopify;
  if (!isShopify) return false;
  log(debugMode, 'Shopify detected — attaching ecommerce listeners');

  const currency = (window as any).Shopify?.currency?.active || 'EUR';

  // ── Add to cart (intercept form submit) ────────────────────
  document.addEventListener('submit', (e) => {
    const form = e.target as HTMLFormElement;
    if (!form || form.tagName !== 'FORM') return;
    const action = (form.action || '').toLowerCase();
    if (!action.includes('/cart/add')) return;

    // Extract product info from Shopify product JSON
    const productData = (window as any).__SHOPIFY_PRODUCT_JSON
      || (window as any).ShopifyAnalytics?.meta?.product;
    const name = productData?.title
      || document.querySelector<HTMLElement>('.product__title, h1.product-title, [data-product-title]')?.textContent?.trim()
      || '';
    const price = productData?.price
      ? productData.price / 100 // Shopify stores in cents
      : parseFloat(document.querySelector<HTMLElement>('.product__price, [data-product-price]')?.textContent?.replace(/[^\d.,]/g, '').replace(',', '.') || '0') || 0;
    const qty = parseInt(form.querySelector<HTMLInputElement>('[name="quantity"]')?.value || '1', 10) || 1;
    const variantId = form.querySelector<HTMLInputElement>('[name="id"]')?.value || '';

    const payload = createEcommercePayload('add_to_cart', {
      currency,
      items: [{ id: variantId, name, price, quantity: qty }],
    });
    emitEvent(payload);
    log(debugMode, 'Shopify add_to_cart:', name, 'x', qty);
  }, true);

  // ── Purchase (thank-you page) ──────────────────────────────
  if ((window as any).Shopify?.checkout) {
    const checkout = (window as any).Shopify.checkout;
    if (checkout.order_id) {
      const items = (checkout.line_items || []).map((li: any) => ({
        id: String(li.variant_id || li.product_id || ''),
        name: li.title || '',
        price: parseFloat(li.price) || 0,
        quantity: li.quantity || 1,
      }));

      const payload = createEcommercePayload('purchase', {
        order_id: String(checkout.order_id),
        total: parseFloat(checkout.total_price) || 0,
        revenue: parseFloat(checkout.subtotal_price) || 0,
        currency,
        items,
      });
      emitEvent(payload);
      log(debugMode, 'Shopify purchase:', checkout.order_id);
    }
  }

  return true;
}

/* ------------------------------------------------------------------ */
/*  Main entry point                                                   */
/* ------------------------------------------------------------------ */

export function autoDetectEcommerce(
  emitEvent: (payload: Partial<EventPayload>) => void,
  debugEnabled: boolean = false,
): void {
  debugMode = debugEnabled;

  // Try each platform — first match wins
  if (detectWooCommerce(emitEvent)) return;
  if (detectShopify(emitEvent)) return;
}

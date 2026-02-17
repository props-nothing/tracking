/**
 * Session-level custom properties — persisted and sent with every event
 */

let customProps: Record<string, any> = {};

export function setCustomProps(props: Record<string, any>): void {
  customProps = { ...customProps, ...props };
}

export function getCustomProps(): Record<string, any> {
  return { ...customProps };
}

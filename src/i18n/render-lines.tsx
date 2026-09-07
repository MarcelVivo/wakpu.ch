import { Fragment } from "react";

/** Dictionary strings use \n for intentional line breaks in short marketing copy. */
export function Lines({ text }: { text: string }) {
  const parts = text.split("\n");
  return <>{parts.map((part, index) => <Fragment key={index}>{index > 0 && <br />}{part}</Fragment>)}</>;
}

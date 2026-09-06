import Link from "next/link";

export function Logo({ large = false }: { large?: boolean }) {
  return <Link href="/" aria-label="WAKPU Startseite" className={`wordmark${large ? " wordmark-large" : ""}`}>WAKPU</Link>;
}

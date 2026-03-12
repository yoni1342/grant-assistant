import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>Page Not Found</h2>
      <p style={{ color: "#666", marginTop: "0.5rem" }}>
        The page you are looking for does not exist.
      </p>
      <Link href="/" style={{ marginTop: "1rem", display: "inline-block" }}>
        Go home
      </Link>
    </div>
  );
}

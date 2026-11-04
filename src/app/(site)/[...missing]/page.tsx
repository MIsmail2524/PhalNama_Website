import { notFound } from "next/navigation";

// Routes unknown URLs through the site layout so the 404 page keeps the header and footer.
export default function Missing() {
  notFound();
}

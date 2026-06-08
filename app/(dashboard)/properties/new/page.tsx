import { redirect } from "next/navigation";

export default function NewPropertyPage() {
  redirect("/?addProperty=1");
}

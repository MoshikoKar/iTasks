import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ContactSupportForm } from "@/components/contact-support-form";

export default async function ContactPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-neutral-100 mb-2">Contact Support</h1>
      <p className="text-slate-600 dark:text-neutral-400 mb-6">
        Report app problems, share improvement ideas, or contact IT/admin for assistance.
      </p>
      <ContactSupportForm userEmail={user.email} userName={user.name} />
    </div>
  );
}

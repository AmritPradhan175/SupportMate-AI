import { ChatApp } from "@/components/ChatApp";
import { getAllFaqs } from "@/lib/knowledge";

export default function Home() {
  return (
    <ChatApp
      appName={process.env.NEXT_PUBLIC_APP_NAME ?? "SupportMate AI"}
      supportEmail={process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@example.com"}
      faqCount={getAllFaqs().length}
    />
  );
}

"use client";

import { useChat } from "@/hooks/useChat";
import { ChatWindow } from "./ChatWindow";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { MessageComposer } from "./MessageComposer";

interface ChatAppProps {
  appName: string;
  supportEmail: string;
  faqCount: number;
}

export function ChatApp({ appName, supportEmail, faqCount }: ChatAppProps) {
  const { messages, isHydrated, isLoading, error, sendMessage, retry, dismissError, newChat } = useChat();

  return (
    <div className="flex h-dvh flex-col">
      <Header appName={appName} faqCount={faqCount} canReset={messages.length > 0 || error !== null} onNewChat={newChat} />

      <main className="flex min-h-0 flex-1 flex-col">
        <h1 className="sr-only">{appName} customer support chat</h1>
        <ChatWindow
          messages={messages}
          isHydrated={isHydrated}
          isLoading={isLoading}
          error={error}
          supportEmail={supportEmail}
          onSelectQuestion={sendMessage}
          onRetry={retry}
          onDismissError={dismissError}
        />
        <MessageComposer onSend={sendMessage} isBusy={isLoading} hasMessages={messages.length > 0} onClear={newChat} />
      </main>

      <Footer supportEmail={supportEmail} />
    </div>
  );
}

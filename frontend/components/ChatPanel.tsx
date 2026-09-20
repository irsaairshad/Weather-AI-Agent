"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { streamChat } from "@/lib/api";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChatPanelProps = {
  city: string;
  open: boolean;
  onClose: () => void;
};

export function ChatPanel({
  city,
  open,
  onClose,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I’m Nimbus. Ask me about the weather, travel timing, or what to wear.",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to the newest message during streaming.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const question = input.trim();

    if (!question || loading) return;

    // Capture history before adding the new pending messages.
    const recentHistory = messages
      .filter((message) => message.content.trim())
      .slice(-6)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    setInput("");
    setLoading(true);

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        role: "user",
        content: question,
      },
      {
        role: "assistant",
        content: "",
      },
    ]);

    try {
      await streamChat(
        question,
        city,
        recentHistory,
        (token: string) => {
          setMessages((currentMessages) => {
            const updatedMessages = [...currentMessages];
            const assistantIndex = updatedMessages.length - 1;
            const assistantMessage =
              updatedMessages[assistantIndex];

            updatedMessages[assistantIndex] = {
              role: "assistant",
              content: assistantMessage.content + token,
            };

            return updatedMessages;
          });
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown assistant error";

      setMessages((currentMessages) => {
        const updatedMessages = [...currentMessages];

        updatedMessages[updatedMessages.length - 1] = {
          role: "assistant",
          content: `Nimbus could not respond: ${errorMessage}`,
        };

        return updatedMessages;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside
      className={`chat-panel ${open ? "open" : ""}`}
      aria-hidden={!open}
    >
      <header>
        <div className="chat-avatar">
          <Bot size={20} />
        </div>

        <div>
          <strong>Nimbus AI</strong>

          <span>
            <i /> Weather assistant
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close assistant"
        >
          <X />
        </button>
      </header>

      <div className="chat-context">
        <Sparkles size={15} />
        Live context: {city} weather
      </div>

      <div className="messages">
        {messages.map((message, index) => (
          <div
            className={`message ${message.role}`}
            key={`${message.role}-${index}`}
          >
            {message.content || (
              <span className="typing">
                <b />
                <b />
                <b />
              </span>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={submit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about your day…"
          aria-label="Message Nimbus"
          disabled={loading}
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </form>

      <small>
        AI can make mistakes. Check critical weather alerts.
      </small>
    </aside>
  );
}
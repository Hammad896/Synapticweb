import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, Send, X } from "lucide-react";
import {
  FALLBACK,
  GREETING,
  QUICK_REPLIES,
  findAnswer,
} from "@/data/assistant";
import { COMPANY } from "@/data/site";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  from: "bot" | "user";
  text: string;
  chips?: string[];
}

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * "Lab Assist" — a grounded assistant, not an LLM.
 *
 * Every answer is derived from `data/site.ts`, so the bot and the page can never
 * contradict each other, and it is structurally incapable of inventing a price,
 * a timeline, or a client. When it doesn't know, it says so and hands off to a
 * human. On commercial questions a confident wrong answer is worse than none.
 *
 * (To make it a real LLM later, replace `respond()` with a fetch to a serverless
 * endpoint. It cannot be done from the browser directly — the API key would ship
 * in the bundle for anyone to lift.)
 */
const LabAssist = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, from: "bot", text: GREETING, chips: QUICK_REPLIES },
  ]);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);

  // Keep the newest message in view.
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Escape closes the panel — expected of any dialog.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const respond = (question: string) => {
    const intent = findAnswer(question);

    // A brief pause: an instant answer reads as a canned lookup rather than a reply.
    setIsTyping(true);
    window.setTimeout(() => {
      setIsTyping(false);
      setMessages((current) => [
        ...current,
        {
          id: nextId.current++,
          from: "bot",
          text: intent ? intent.answer : FALLBACK,
          chips: intent?.followUps,
        },
      ]);
    }, 550);
  };

  const send = (text: string) => {
    const question = text.trim();
    if (!question) return;

    setMessages((current) => [
      ...current,
      { id: nextId.current++, from: "user", text: question },
    ]);
    setInput("");
    respond(question);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send(input);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label="Lab Assist — chat with Synaptic Lab"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.4, ease: EASE }}
            // Sits above BOTH floating buttons (chat at bottom-6, WhatsApp at
            // bottom-24), so nothing ever overlaps.
            //
            // `dvh` not `vh`: on mobile, 100vh excludes the address bar, so a
            // vh-sized panel is taller than the visible viewport and its input
            // row gets cut off exactly when the keyboard opens.
            className="surface fixed bottom-40 right-4 z-50 flex h-[min(32rem,calc(100dvh-13rem))] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden sm:right-6"
          >
            <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                <div>
                  <p className="text-sm font-semibold tracking-[-0.01em] text-foreground">
                    Lab Assist
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Answers from {COMPANY.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close Lab Assist"
                className="tap -mr-2 rounded-full text-muted-foreground transition-colors duration-300 ease-apple hover:text-foreground"
              >
                <X size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </header>

            <div
              ref={listRef}
              // Announced politely so a screen-reader user hears replies without
              // the panel stealing focus mid-typing.
              aria-live="polite"
              className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5"
            >
              {messages.map((message) => (
                <div key={message.id} className="flex flex-col gap-3">
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      message.from === "bot"
                        ? "self-start bg-muted text-foreground"
                        : "self-end bg-accent-solid text-accent-foreground",
                    )}
                  >
                    {message.text}
                  </div>

                  {message.chips && message.chips.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {message.chips.map((chip) => (
                        <li key={chip}>
                          <button
                            type="button"
                            onClick={() => send(chip)}
                            className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground transition-colors duration-300 ease-apple hover:border-accent hover:text-accent"
                          >
                            {chip}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-1.5 self-start rounded-2xl bg-muted px-4 py-3.5">
                  <span className="sr-only">Lab Assist is typing</span>
                  {[0, 1, 2].map((dot) => (
                    <motion.span
                      key={dot}
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 1.1,
                        repeat: Infinity,
                        delay: dot * 0.15,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t border-border px-4 py-3"
            >
              <label htmlFor="lab-assist-input" className="sr-only">
                Ask Lab Assist a question
              </label>
              <input
                id="lab-assist-input"
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about pricing, timelines, the team…"
                autoComplete="off"
                className="flex-1 bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={!input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-solid text-accent-foreground transition-all duration-300 ease-apple hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={15} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? "Close Lab Assist" : "Open Lab Assist — chat with us"}
        aria-expanded={isOpen}
        className="group fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-4 z-50 flex items-center rounded-full border border-border bg-card/80 p-4 text-foreground shadow-lg backdrop-blur-md transition-all duration-500 ease-apple hover:scale-[1.02] hover:border-accent hover:text-accent sm:right-6"
      >
        {isOpen ? (
          <X size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
        ) : (
          <MessageSquare
            size={20}
            strokeWidth={1.75}
            aria-hidden="true"
            className="shrink-0"
          />
        )}

        {!isOpen && (
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-500 ease-apple group-hover:ml-3 group-hover:max-w-[10rem] group-hover:opacity-100">
            Lab Assist
          </span>
        )}
      </button>
    </>
  );
};

export default LabAssist;

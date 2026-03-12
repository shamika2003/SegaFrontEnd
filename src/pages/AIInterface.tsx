import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftFromLine,
  ArrowRightFromLine,
  AudioLines,
  Plus,
  Send,
  SquarePen,
  TextSearch
} from "lucide-react";
import { connectSocket, disconnectSocket, sendMessage } from "../API/Connection";
import Navbar from "../components/layout/Navbar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import TypingIndicator from "../components/ui/TypingIndicator";
import { FcGoogle } from "react-icons/fc";
import { useGoogleLogin } from "@react-oauth/google";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useNavigate, useParams } from "react-router-dom";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

type ChatMessage = {
  id: string;
  role: "User" | "Assistant";
  content: string;
  streaming?: boolean;
  files?: {
    type: "image" | "file";
    name: string;
    content: string;
  }[];
};

type User = {
  id: string;
  name: string;
  avatar_url?: string;
};

type ChatList = {
  id: string;
  title: string;
  created_at: string;
};

type Preview = {
  id: string;
  name: string;
  url?: string;
};


const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function AIInterface() {
  const { conversationId: routeConversationId } = useParams();
  const navigate = useNavigate();

  const signInRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const currentTokenRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTitlesRef = useRef(new Set<string>());
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [chatList, setChatList] = useState<ChatList[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const chatListRef = useRef<ChatList[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [hasScroll, setHasScroll] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [popupOpen, setPopupOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [imageName, setImageName] = useState('');
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // set user state
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return null;

    try {
      return JSON.parse(stored) as User;
    } catch {
      return null;
    }
  });

  const isAssistantStreaming = messages.some(
    m => m.role === "Assistant" && m.streaming
  );

  const saveData = (data: { access_token: string; user: User }) => {
    window.__ACCESS_TOKEN__ = data.access_token;
    localStorage.setItem("user", JSON.stringify(data.user));
  };

  // Log in model open
  const openModal = () => {
    if (!signInRef.current) return;

    const buttonRect = signInRef.current.getBoundingClientRect();

    setIsModalOpen(true);

    requestAnimationFrame(() => {
      if (!modalRef.current) return;

      const modalRect = modalRef.current.getBoundingClientRect();

      const deltaX = buttonRect.left + buttonRect.width / 2 - (modalRect.left + modalRect.width / 2);
      const deltaY = buttonRect.top + buttonRect.height / 2 - (modalRect.top + modalRect.height / 2);
      const scale = buttonRect.width / modalRect.width;

      modalRef.current.style.transform = `
      translate(${deltaX}px, ${deltaY}px) scale(${scale})
    `;
      modalRef.current.style.opacity = "0";

      requestAnimationFrame(() => {
        modalRef.current!.style.transition =
          "transform 900ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 600ms ease";
        modalRef.current!.style.transform = "translate(0, 0) scale(1)";
        modalRef.current!.style.opacity = "1";
      });
    });
  };

  // Log in model close
  const closeModal = () => {
    if (!signInRef.current || !modalRef.current) {
      setIsModalOpen(false);
      return;
    }

    const buttonRect = signInRef.current.getBoundingClientRect();
    const modalRect = modalRef.current.getBoundingClientRect();

    const deltaX =
      buttonRect.left + buttonRect.width / 2 -
      (modalRect.left + modalRect.width / 2);

    const deltaY =
      buttonRect.top + buttonRect.height / 2 -
      (modalRect.top + modalRect.height / 2);

    const scale = buttonRect.width / modalRect.width;

    modalRef.current.style.transition =
      "transform 500ms cubic-bezier(0.4, 0, 0.2, 1), opacity 400ms ease";

    modalRef.current.style.transform = `
    translate(${deltaX}px, ${deltaY}px) scale(${scale})
  `;
    modalRef.current.style.opacity = "0";

    // wait for animation to finish before unmount
    setTimeout(() => {
      setIsModalOpen(false);
    }, 280);
  };

  //  Input helpers
  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const handleClick = () => {
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendCurrentMessage();
    }
  };

  // Typing animation helper
  const typeChatTitle = (conversationId: string, fullTitle: string) => {
    let index = 0;

    const interval = setInterval(() => {
      index += 1;

      setChatList(prev =>
        prev.map(c =>
          c.id === conversationId
            ? { ...c, title: fullTitle.slice(0, index) }
            : c
        )
      );

      if (index >= fullTitle.length) clearInterval(interval);
    }, 10);
  };

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const sendCurrentMessage = async () => {
    const el = textareaRef.current;
    if (!el || isSending) return;

    const text = el.value.trim();
    if (!text && !fileName && !imageName) return;

    const token = window.__ACCESS_TOKEN__;
    if (!token) return;

    ensureSocket();


    const files: { type: "image" | "file"; name: string; content: string }[] = [];

    for (const file of selectedFiles) {
      const content = await fileToBase64(file);

      files.push({
        type: file.type.startsWith("image") ? "image" : "file",
        name: file.name,
        content
      });
    }

    const msgPayload = {
      user_input: text,
      conversation_id: conversationId,
      response_mode: "text_stream",
      files
    };

    setMessages(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "User",
        content: text,
        files: files.length ? files : undefined,
      },
    ]);

    sendMessage(msgPayload);

    console.log("FILES SENT:", files);

    setIsSending(true);
    setSelectedFiles([]);
    el.value = "";
    autoResize();
    setFileName('');
    setImageName('');
    setPreviews(prev => {
      prev.forEach(p => p.url && URL.revokeObjectURL(p.url));
      return [];
    });
  };

  const ensureSocket = () => {
    const token = window.__ACCESS_TOKEN__;
    if (!token) return;

    if (currentTokenRef.current === token) return;

    connectSocket(token, (msg) => {

      // Conversation created / identified
      if (msg.type === "meta") {
        setConversationId(msg.conversation_id);

        const exists = chatListRef.current.find(
          c => c.id === msg.conversation_id
        );

        if (exists) {
          console.log("exists");

          // Only update title if actually different
          if (msg.title && msg.title !== exists.title) {
            if (!typingTitlesRef.current.has(msg.conversation_id)) {
              typingTitlesRef.current.add(msg.conversation_id);
              typeChatTitle(msg.conversation_id, msg.title ?? "Untitled");
            }
          }

        } else {
          console.log("new");

          setChatList(prev => [
            {
              id: msg.conversation_id,
              title: "",
              created_at: new Date().toISOString(),
            },
            ...prev,
          ]);

          if (!typingTitlesRef.current.has(msg.conversation_id)) {
            typingTitlesRef.current.add(msg.conversation_id);
            typeChatTitle(msg.conversation_id, msg.title ?? "Untitled");
          }
        }

        if (!routeConversationId) {
          window.history.replaceState(
            null,
            "",
            `/ai-interface/c/${msg.conversation_id}`
          );
        }

        return;
      }

      // Streaming token
      if (msg.type === "token") {
        setIsSending(false);
        setMessages((prev) => {
          const index = prev.findIndex(
            (m) => m.id === msg.message_id
          );

          // Append to existing assistant message
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              content: updated[index].content + msg.content,
            };
            return updated;
          }

          // First token → create assistant message
          return [
            ...prev,
            {
              id: msg.message_id,
              role: "Assistant",
              content: msg.content,
              streaming: true,
            },
          ];
        });
      }

      // Stream finished
      if (msg.type === "done") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.message_id
              ? { ...m, streaming: false }
              : m
          )
        );

      }
    });

    currentTokenRef.current = token;
  };




  useEffect(() => {
    chatListRef.current = chatList;
  }, [chatList]);

  useEffect(() => {
    return () => {
      disconnectSocket();
      currentTokenRef.current = null;
    };
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/check`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        });

        if (!res.ok) {
          setAuthChecked(true);
          return;
        }

        const data = await res.json();

        if (data.access_token) {
          setAccessToken(data.access_token);
          window.__ACCESS_TOKEN__ = data.access_token;
        }

        setAuthChecked(true);
      } catch (e) {
        console.error("Auth check failed", e);
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (!authChecked || !accessToken) return;

    const fetchPastChats = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/conversations_list`, {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
          credentials: "include",
        });

        if (!res.ok) {
          setChatList([]);
          return;
        }

        const data = await res.json();
        setChatList(data.conversation_list || []);
      } catch (e) {
        console.error("Chat list fetch failed", e);
      }
    };

    fetchPastChats();
  }, [authChecked, accessToken]);

  useEffect(() => {
    //  Load history via HTTP
    const fetchHistory = async () => {

      if (!authChecked || !accessToken || !routeConversationId) return;

      setConversationId(routeConversationId);

      try {
        const res = await fetch(
          `${API_BASE}/api/conversations/${routeConversationId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${accessToken}`,
            },
            credentials: "include",
          }
        );

        if (!res.ok) {
          const text = await res.text();
          console.error("Failed to fetch conversation:", text);
          setMessages([]);
          window.location.href = '/ai-interface';
        }

        const data = await res.json();
        setMessages(data.messages || []);
      } catch (err) {
        console.error("Error fetching conversation:", err);
        setMessages([]);
        window.location.href = '/ai-interface';
      }
    };
    fetchHistory();
  }, [routeConversationId, window.__ACCESS_TOKEN__]);

  // google connect
  const googleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      handleLogin("google", {
        accessToken: tokenResponse.access_token,
      });
    },
    onError: () => {
      console.error("Google Login Failed");
    },
  });

  //handle all login
  const handleLogin = async (
    provider: "email" | "google" | "facebook" | "github",
    credentials?: any
  ) => {
    try {
      setIsLoading(true);

      let body: any = { provider };
      if (provider === "email") {
        body.email = credentials.email;
      } else {
        body.accessToken = credentials.accessToken;
      }

      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      const data = await res.json();
      console.log(data);

      saveData(data);
      setUser(data.user);
      setAccessToken(data.access_token);
      window.__ACCESS_TOKEN__ = data.access_token;

      closeModal();

      // Fetch chat list immediately after login
      fetchChatList(data.access_token);

    } catch (err) {
      console.error(`${provider} login failed:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChatList = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/conversations_list`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (!res.ok) {
        setChatList([]);
        return;
      }

      const data = await res.json();
      const list: ChatList[] = data.conversation_list || [];

      // Apply typing effect for each chat
      list.forEach(chat => {
        const exists = chatListRef.current.find(c => c.id === chat.id);

        if (!exists) {
          setChatList(prev => [
            { id: chat.id, title: "", created_at: chat.created_at },
            ...prev
          ]);

          typeChatTitle(chat.id, chat.title ?? "Untitled");
        }
      });


    } catch (err) {
      console.error("Failed to fetch chat list:", err);
    }
  };

  //sign out
  const signout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include", // IMPORTANT
      });
    } catch (e) {
      console.error("Logout failed", e);
    }

    // Clear client state
    localStorage.removeItem("user");
    delete (window as any).__ACCESS_TOKEN__;
    delete (window as any).__USER_ID__;

    setUser(null);
    setConversationId(null);
    setMessages([]);
    setChatList([]);
    navigate("/ai-interface");
  };

  // Scroll handling

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // true only if scrollbar already exists
    const overflow = el.scrollHeight > el.clientHeight + 1;

    setHasScroll(overflow);
  }, [messages.length]); // only when messages are added

  function getTextFromReactNode(children: React.ReactNode): string {
    if (typeof children === "string") return children;
    if (Array.isArray(children)) return children.map(getTextFromReactNode).join("");
    if (typeof children === "object" && children && "props" in children) {
      return getTextFromReactNode((children as any).props.children);
    }
    return "";
  }

  function CodeBlock({
    language,
    codeText,
  }: {
    language: string;
    codeText: string;
  }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(codeText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Copy failed:", err);
      }
    };

    return (
      <div className="code-block">
        <div className="code-lang">
          <span>{language.toUpperCase()}</span>
          <button
            onClick={handleCopy}
            disabled={copied}
            className="copy-btn"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <pre>
          <code className={`language-${language}`}>
            {codeText}
          </code>
        </pre>
      </div>
    );
  }


  useEffect(() => {
    if (!isAssistantStreaming) {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [messages.length]);

  const makeId = () => Math.random().toString(36).substring(2, 9);

  //  files
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setSelectedFiles(prev => [...prev, ...files]);

    const newPreviews = files.map(f => ({
      id: makeId(),
      name: f.name
    }));

    setPreviews(prev => [...prev, ...newPreviews]);

    e.target.value = "";
    setPopupOpen(false);
  };

  // images
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setSelectedFiles(prev => [...prev, ...files]);

    const newPreviews = files.map(img => ({
      id: makeId(),
      name: img.name,
      url: URL.createObjectURL(img)
    }));

    setPreviews(prev => [...prev, ...newPreviews]);

    e.target.value = "";
    setPopupOpen(false);
  };

  useEffect(() => {
    return () => {
      // component is going away → revoke every blob URL we created
      previews.forEach(p => p.url && URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  return (
    <main className="relative h-screen dark:bg-gradient-to-b from-[#0b0f14] via-[#070a0f] to-black">

      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 opacity-60 animate-pulse"></div>

            <div className="relative w-16 h-16 rounded-full animate-spin bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-1">
              <div className="w-full h-full bg-black/80 rounded-full"></div>
            </div>
          </div>
        </div>
      )}

      <Navbar />

      <section className="h-screen relative z-10 pt-16 overflow-hidden">
        <div className="flex w-full h-full">
          <div
            className={`h-full flex flex-col flex-shrink-0 bg-black/10 dark:bg-black/40 border-r border-gray-300 dark:border-white/10 
              transition-[width] duration-300 ease-in-out ${isOpen ? "w-[250px]" : "w-14"}`}
          >
            {/* Header / Toggle */}
            <div className="w-full p-2 flex items-center justify-end">

              {isOpen && (
                <div className="flex-1 ms-2">
                  {user ? (
                    <div className="">
                      <Menu as="div" className="relative inline-block">
                        <MenuButton
                          className="inline-flex items-center justify-center rounded-full bg-white text-sm font-semibold text-gray-900
                          shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-xl hover:-translate-y-[2px] focus:outline-none 
                          focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:translate-y-0"
                        >
                          {typeof user?.avatar_url === "string" && user.avatar_url.startsWith("https") ? (
                            <img
                              src={user.avatar_url}
                              alt={user.name}
                              className="h-8 w-8 rounded-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm font-semibold">
                              {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                            </div>
                          )}

                        </MenuButton>

                        <MenuItems
                          transition
                          className="absolute left-0 z-10 mt-2 w-56 origin-top-left rounded-md dark:bg-gray-400 bg-white shadow-lg outline-1 
                          outline-black/5 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 
                          data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                        >
                          <div className="py-1">
                            <MenuItem>
                              <a
                                href="#"
                                className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900 
                              data-focus:outline-hidden"
                              >
                                Account settings
                              </a>
                            </MenuItem>
                            <MenuItem>
                              <a
                                href="#"
                                className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900 data-focus:outline-hidden"
                              >
                                Support
                              </a>
                            </MenuItem>
                            <MenuItem>
                              <a
                                href="#"
                                className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900 data-focus:outline-hidden"
                              >
                                License
                              </a>
                            </MenuItem>
                            <MenuItem>
                              <button
                                onClick={signout}
                                className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900 data-focus:outline-hidden"
                              >
                                Sign out
                              </button>
                            </MenuItem>
                          </div>
                        </MenuItems>
                      </Menu>
                    </div>
                  ) : (
                    <div className="ms-10">
                      <button
                        ref={signInRef}
                        onClick={() => openModal()}
                        className=" p-1 px-3 truncate rounded-lg flex items-center text-sm dark:text-white
                        bg-gray-300/90 dark:bg-gray-800/90 hover:bg-gray-400/50 dark:hover:bg-gray-600 transition-colors"
                      >
                        Sign In
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1 rounded text-gray-700 dark:text-white hover:bg-gray-400/40 dark:hover:bg-gray-700 transition-colors"
              >
                {isOpen ? (
                  <ArrowLeftFromLine className="h-5 w-5" />
                ) : user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="h-6 w-6 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <ArrowRightFromLine className="h-5 w-5" />
                )}
              </button>

            </div>

            {/* Modal */}
            {isModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                onClick={closeModal}
              >
                <div
                  ref={modalRef}
                  onClick={(e) => e.stopPropagation()}
                  className="dark:bg-gray-700 bg-white w-96 rounded-lg p-6 shadow-xl"
                >
                  <form className="space-y-3 mb-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      // handleLogin("email", { email: emailValue });
                    }}>
                    <div className="relative">
                      <input
                        id="email"
                        placeholder=" "
                        value={emailValue}
                        onChange={(e) => setEmailValue(e.target.value)}
                        type="email"
                        className="peer w-full rounded-xl dark:bg-white/20 bg-black/10 backdrop-blur px-4 pt-6 pb-1 text-gray-600 border border-black/20
                        dark:border-white/20 focus:border-indigo-400 focus:ring-2 focus:text-indigo-900 focus:ring-indigo-400/30 outline-none transition"
                      />
                      <label
                        htmlFor="email"
                        className={`absolute left-4 top-4 dark:text-gray-300 text-gray-600 transition-all duration-200 peer-placeholder-shown:top-4
                        peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs peer-focus:text-indigo-800 
                        ${emailValue ? "top-1 text-xs" : "top-4 text-sm"}`}

                      >
                        Email address
                      </label>
                    </div>

                    <div>
                      <button
                        type="submit"
                        className="flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                      >
                        Sign in
                      </button>
                    </div>
                  </form>

                  <hr></hr>

                  <div className="mt-3">

                    <button
                      type="button"
                      onClick={() => googleLogin()}
                      className="flex items-center justify-center w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 transition"
                    >
                      <FcGoogle className="mr-2 w-5 h-5" />
                      Sign in with Google
                    </button>

                  </div>
                </div>
              </div>
            )}


            {/* Actions */}
            <div className="px-2 space-y-1">
              {[
                { label: "New Chat", href: '/ai-interface', icon: SquarePen },
                { label: "Search Chat", icon: TextSearch },
              ].map(({ label, icon: Icon, href }) => (
                <button
                  key={label}
                  onClick={() => href && (window.location.href = href)}
                  className="group relative w-full px-3 py-2 rounded-lg flex items-center gap-3 text-sm
                  bg-gray-300/30 dark:bg-gray-900/50 hover:bg-gray-400/50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Icon className="h-5 w-5 shrink-0 dark:text-white" />

                  {/* Text (only when open) */}
                  {isOpen && <span className="truncate dark:text-white">{label}</span>}

                  {/* Tooltip (only when closed) */}
                  {!isOpen && (
                    <span
                      className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap
                   rounded-md px-3 py-1 text-xs bg-gray-900 text-white opacity-0 group-hover:opacity-100
                   transition-opacity duration-200 z-50"
                    >
                      {label}
                    </span>
                  )}
                </button>
              ))}

              <button
                onClick={() => { window.location.href = '/ai-interface-voice'; }}
                className="group relative w-full px-3 py-2 rounded-lg flex items-center gap-3 text-sm
                  animate-gradient opacity-80"
              >
                <AudioLines />
                {/* Text (only when open) */}
                {isOpen && <span className="truncate dark:text-white">Sega Voice</span>}

                {/* Tooltip (only when closed) */}
                {!isOpen && (
                  <span
                    className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap
                   rounded-md px-3 py-1 text-xs bg-gray-900 text-white opacity-0 group-hover:opacity-100
                   transition-opacity duration-200 z-50"
                  >
                    Sega Voice
                  </span>
                )}
              </button>

            </div>

            <hr className="my-3 mx-2 border-gray-400/50 dark:border-white/10" />

            {/* Past Chats */}
            <div className="flex flex-col flex-1 overflow-hidden">
              {isOpen && (
                <span className="px-4 py-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Past Chats
                </span>
              )}

              <div className="flex-1 overflow-y-auto px-2 space-y-1">
                {chatList.map((chat, index) => (
                  <button
                    key={index}
                    onClick={() => navigate(`/ai-interface/c/${chat.id}`)}
                    className={`group relative w-full px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300
                    hover:bg-gray-300 dark:hover:bg-gray-900 transition-colors flex items-center gap-3
                    ${chat.id == conversationId ? "dark:bg-gray-900 bg-gray-300" : ""}`}
                  >
                    {/* Text */}
                    {isOpen && (
                      <span className="truncate block">{chat.title}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-full w-full relative border border-white/10 flex flex-col">

            <div
              ref={scrollRef}
              className="flex-1 w-full overflow-x-auto h-full overflow-y-auto px-12 py-4 space-y-4 mb-6 scroll-fade"
            >
              {messages.map((m, i) => {
                const isLastAssistant =
                  m.role === "Assistant" && i === messages.length - 1;

                return (
                  <div
                    key={m.id}
                    style={{
                      minHeight: (() => {
                        if (!isLastAssistant) return "auto";
                        const el = scrollRef.current;
                        if (!el) return "auto";
                        return el.scrollHeight > el.clientHeight ? "54vh" : "auto";
                      })(),
                    }}
                    className={`flex w-full ${m.role === "User" ? "justify-end" : "justify-start"
                      }`}
                  >
                    <div
                      className={`rounded-xl dark:text-white ${m.role === "User"
                        ? "max-w-2xl bg-blue-500/20 user-message"
                        : "markdown w-full"
                        }`}
                    >
                      {m.role === "User" ? (
                        <div className="flex flex-col gap-2 p-4">

                          {/* Attachments */}
                          {m.files && m.files.length > 0 && (
                            <div className="flex gap-3 overflow-x-auto">
                              {m.files.map((f, idx) =>
                                f.type === "image" ? (
                                  // ---- Image preview ----
                                  <img
                                    key={idx}
                                    src={f.content}
                                    alt={f.name}
                                    // ← the magic line ↓
                                    className="flex-[1_1_0] min-w-[80px] max-w-xs rounded-lg"
                                  />
                                ) : (
                                  // ---- Generic file link ----
                                  <a
                                    key={idx}
                                    href={f.content}
                                    download={f.name}
                                    className="flex items-center gap-1 px-3 py-2 bg-gray-200/70 rounded-md hover:bg-gray-300"
                                  >
                                    <span className="text-xl">📄</span>
                                    <span className="text-sm">{f.name}</span>
                                  </a>
                                )
                              )}
                            </div>
                          )}
                          
                          {/* Text (if any) */}
                          {m.content && (
                            <pre className="flex justify-end whitespace-pre-wrap">{m.content}</pre>
                          )}
                        </div>
                      ) : (
                        // Assistant messages with ReactMarkdown
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight]}
                          components={{
                            img({ src, alt }) {
                              return (
                                <img
                                  src={src}
                                  alt={alt || "image"}
                                  loading="lazy"
                                  className="rounded-lg my-3 max-w-full"
                                />
                              );
                            },

                            a({ href, children }) {
                              const isVideo = href?.match(/\.(mp4|webm|ogg)$/i);
                              if (isVideo) {
                                return (
                                  <video
                                    controls
                                    className="rounded-lg my-3 max-w-full"
                                  >
                                    <source src={href} />
                                  </video>
                                );
                              }
                              return (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer nofollow"
                                  className="text-indigo-500 hover:underline"
                                >
                                  {children}
                                </a>
                              );
                            },

                            code({ className, children }) {
                              const match = /language-(\w+)/.exec(className || "");
                              const language = match?.[1];

                              if (!language) {
                                return (
                                  <code className="inline-code">
                                    {children}
                                  </code>
                                );
                              }

                              const codeText = getTextFromReactNode(children).replace(/\n$/, "");

                              return (
                                <CodeBlock
                                  language={language}
                                  codeText={codeText}
                                />
                              );
                            },
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                );
              })}

              {isSending && (
                <div className="min-h-[40px]">
                  <TypingIndicator />
                </div>
              )}

              {hasScroll && (
                <div
                  style={{
                    height:
                      isSending || isAssistantStreaming ? "60vh" : "12vh",
                    minHeight: "72px",
                  }}
                />
              )}

              {/* Scroll anchor */}
              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="absolute bottom-4 left-0 right-0 px-4 sm:px-8 lg:px-12 mb-2">
              <div className="h-16 px-28 flex items-end">

                <div className="w-full flex items-end gap-3 bg-black/20 py-2 px-3 backdrop-blur rounded-3xl
                                focus-within:ring-1 focus-within:ring-blue-500 focus-within:ring-opacity-50
                                border border-white/10 transition"
                  onClick={handleClick}>

                  <div className="relative inline-block">
                    <button
                      onClick={() => setPopupOpen(!popupOpen)}
                      className="dark:text-white px-2 py-2 rounded-full transition bg-black/10 dark:bg-white/5 hover:bg-black/20 dark:hover:bg-white/10 disabled:opacity-50">
                      <Plus
                        className={`transition-transform duration-200 ${popupOpen ? "rotate-180" : "rotate-0"
                          }`}
                      />
                    </button>

                    {/* Popup */}
                    {popupOpen && (
                      <div className="absolute bottom-full mb-2 -translate-x-1/2 
                        bg-white dark:bg-zinc-800/40
                        shadow-lg rounded-lg p-2 w-40">

                        <input
                          type="file"
                          multiple
                          ref={fileInputRef}
                          style={{ display: "none" }}
                          onChange={handleFileSelect}
                        />

                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          ref={imageInputRef}
                          style={{ display: "none" }}
                          onChange={handleImageSelect}
                        />

                        <button
                          className="text-sm w-full text-start p-2 hover:bg-black/10
                            dark:hover:bg-white/10 dark:text-white rounded-lg"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Upload file
                        </button>
                        <hr className="mb-1 mt-1" />
                        <button
                          className="text-sm w-full text-start p-2 hover:bg-black/10
                            dark:hover:bg-white/10 dark:text-white rounded-lg"
                          onClick={() => imageInputRef.current?.click()}
                        >
                          Upload image
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 items-center p-0 mb-0">
                    {previews.length > 0 && (
                      <div className="flex flex-wrap gap-2 rounded-lg w-full">
                        {previews.map(p => (
                          <div
                            key={p.id}
                            className="flex items-center gap-1 bg-black/20 rounded-md p-1"
                          >
                            {/* Image thumbnail or file icon */}
                            {p.url ? (
                              <img
                                src={p.url}
                                alt={p.name}
                                className="h-10 w-10 object-cover rounded"
                              />
                            ) : (
                              <span className="text-xl">📄</span>
                            )}

                            {/* File name */}
                            <span className="max-w-xs text-sm text-white truncate">{p.name}</span>

                            {/* Remove button */}
                            <button
                              type="button"
                              className="ml-1 text-gray-300 hover:text-white"
                              onClick={() => {
                                if (p.url) URL.revokeObjectURL(p.url);
                                setPreviews(prev => prev.filter(item => item.id !== p.id));
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <textarea
                      ref={textareaRef}
                      rows={1}
                      placeholder="Type a message..."
                      className="w-full resize-none bg-transparent scroll-fade px-4 py-2 pb-2 dark:text-white placeholder-gray-900 dark:placeholder-gray-400 outline-none max-h-40"
                      onInput={autoResize}
                      onKeyDown={handleKeyDown}
                    />
                  </div>

                  <button
                    className="dark:text-white px-2 py-2 rounded-full transition bg-black/10 dark:bg-white/5 hover:bg-black/20 dark:hover:bg-white/10 disabled:opacity-50"
                    onClick={sendCurrentMessage}
                    disabled={isSending}
                  >
                    <Send />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

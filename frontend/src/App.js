import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import "./App.css";

export default function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [streamType, setStreamType] = useState("sse");
  const [isConfigured, setIsConfigured] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const abortControllerRef = useRef(null);
  const websocketRef = useRef(null);

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleConversationIdChange = (e) => {
    setConversationId(e.target.value);
  };

  const handleAuthTokenChange = (e) => {
    setAuthToken(e.target.value);
  };

  const handleStreamTypeChange = (e) => {
    setStreamType(e.target.value);
  };

  // Cleanup WebSocket connection on unmount
  useEffect(() => {
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  const setupWebSocket = async () => {
    try {
      // Create URL with authorization token in query params
      const wsUrl = new URL(`ws://localhost:8000/api/v1/via-chatbot/conversations/${conversationId}/websocket`);
      wsUrl.searchParams.append('Authorization', authToken);

      const ws = new WebSocket(wsUrl.toString());

      ws.onopen = () => {
        console.log('WebSocket connection established');
        setIsConfigured(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status && data.message) {
            setIsTyping(false);
            setMessages((prev) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              newMessages[newMessages.length - 1] = {
                ...lastMessage,
                text: lastMessage.text + data.message
              };
              return newMessages;
            });
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConfigured(false);
        setMessages((prev) => [
          ...prev,
          { text: "Error: WebSocket connection failed", isUser: false },
        ]);
        setIsTyping(false);
      };

      ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        setIsConfigured(false);
        websocketRef.current = null;
        
        // Add more specific error message for authentication failures
        if (event.code === 1001 || event.code === 1006) {
          setMessages((prev) => [
            ...prev,
            { text: "Error: Authentication failed or connection lost", isUser: false },
          ]);
        }
        setIsTyping(false);
      };

      websocketRef.current = ws;
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      setIsConfigured(false);
      setMessages((prev) => [
        ...prev,
        { text: "Error: Failed to establish WebSocket connection", isUser: false },
      ]);
      setIsTyping(false);
    }
  };

  const handleConfigure = async () => {
    if (!conversationId || !authToken) return;

    if (streamType === "websocket") {
      await setupWebSocket();
    } else {
      setIsConfigured(true);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !isConfigured) return;

    setIsStreaming(true);
    setIsWaitingForResponse(true);
    setMessages((prev) => [...prev, { text: input, isUser: true }]);
    setMessages((prev) => [...prev, { text: "", isUser: false }]);
    setIsTyping(true);

    if (streamType === "websocket") {
      // Send message through existing WebSocket connection
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({
          content: input
        }));
        setInput("");
      } else {
        setMessages((prev) => [
          ...prev,
          { text: "Error: WebSocket connection lost", isUser: false },
        ]);
        setIsConfigured(false);
        setIsTyping(false);
      }
    } else {
      // Handle SSE
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(
          `https://staging-new-tools.tymeline.app/api/v1/via-chatbot/conversations/${conversationId}/messages?stream=true&stream_type=sse`,
          {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'content-type': 'application/json',
              'authorization': authToken,
            },
            body: JSON.stringify({
              content: input
            }),
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch response");
        }

        setInput("");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
            const jsonString = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            
            if (jsonString.trim()) {
              try {
                const data = JSON.parse(jsonString);
                if (data.status && data.message) {
                  setIsTyping(false);
                  setIsWaitingForResponse(false);
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    newMessages[newMessages.length - 1] = {
                      ...lastMessage,
                      text: lastMessage.text + data.message
                    };
                    return newMessages;
                  });
                }
              } catch (e) {
                console.error('Error parsing JSON:', e);
              }
            }
          }
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error streaming response:", error);
          setMessages((prev) => [
            ...prev,
            { text: "Error: Failed to stream response", isUser: false },
          ]);
        }
        setIsTyping(false);
        setIsWaitingForResponse(false);
      } finally {
        setIsStreaming(false);
        setIsTyping(false);
        setIsWaitingForResponse(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleStop = () => {
    if (streamType === "websocket") {
      // For WebSocket, we don't close the connection, just mark streaming as done
      setIsStreaming(false);
    } else if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const handleReset = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
    }
    setIsConfigured(false);
    setMessages([]);
  };

  const TypingIndicator = () => (
    <div className="typing-indicator">
      <span>.</span>
      <span>.</span>
      <span>.</span>
    </div>
  );

  // Component to render markdown content
  const MessageContent = ({ text, isUser }) => {
    if (isUser) {
      // User messages display as plain text
      return <span>{text}</span>;
    }
    
    // Bot messages render as markdown
    return (
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom styling for code blocks
          code: ({node, inline, className, children, ...props}) => {
            return !inline ? (
              <pre className="markdown-code-block" {...props}>
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="markdown-inline-code" {...props}>
                {children}
              </code>
            );
          },
          // Custom styling for blockquotes
          blockquote: ({children}) => (
            <blockquote className="markdown-blockquote">
              {children}
            </blockquote>
          ),
          // Custom styling for tables
          table: ({children}) => (
            <div className="markdown-table-container">
              <table className="markdown-table">
                {children}
              </table>
            </div>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    );
  };

  return (
    <div className="App">
      <div className="chat-container">
        {!isConfigured ? (
          <div className="config-section">
            <input
              type="text"
              value={conversationId}
              onChange={handleConversationIdChange}
              placeholder="Enter Conversation ID..."
              className="config-input"
            />
            <input
              type="password"
              value={authToken}
              onChange={handleAuthTokenChange}
              placeholder="Enter Auth Token..."
              className="config-input"
            />
            <select 
              value={streamType}
              onChange={handleStreamTypeChange}
              className="config-input"
            >
              <option value="sse">Server-Sent Events</option>
              <option value="websocket">WebSocket</option>
            </select>
            <button 
              onClick={handleConfigure}
              disabled={!conversationId || !authToken}
              className="config-button"
            >
              Configure
            </button>
          </div>
        ) : (
          <>
            <div className="config-info">
              <span>Connection Type: {streamType}</span>
              <button onClick={handleReset} className="reset-button">
                Reset Configuration
              </button>
            </div>
            <div className="chat-screen">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`message ${msg.isUser ? "user" : "bot"}`}
                >
                  <MessageContent text={msg.text} isUser={msg.isUser} />
                  {index === messages.length - 1 && !msg.isUser && isTyping && <TypingIndicator />}
                </div>
              ))}
            </div>
            <div className="input-container">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder="Type a message..."
                disabled={isWaitingForResponse}
              />
              <button
                onClick={isStreaming ? handleStop : handleSend}
                disabled={!input.trim() || isWaitingForResponse}
              >
                {isStreaming ? "Stop" : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

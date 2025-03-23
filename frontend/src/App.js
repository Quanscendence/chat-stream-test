import React, { useState, useRef } from "react";
import "./App.css";

export default function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [authToken, setAuthToken] = useState("");
  const abortControllerRef = useRef(null);

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleConversationIdChange = (e) => {
    setConversationId(e.target.value);
  };

  const handleAuthTokenChange = (e) => {
    setAuthToken(e.target.value);
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !conversationId || !authToken) return;

    setIsStreaming(true);
    setMessages((prev) => [...prev, { text: input, isUser: true }]);
    
    // Initialize bot message
    setMessages((prev) => [...prev, { text: "", isUser: false }]);

    // Handle SSE
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/via-chatbot/conversations/${conversationId}/messages?stream=true&stream_type=sse`,
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
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  return (
    <div className="App">
      <div className="chat-container">
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
        </div>
        <div className="chat-screen">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.isUser ? "user" : "bot"}`}
            >
              {msg.text}
            </div>
          ))}
        </div>
        <div className="input-container">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Type a message..."
            disabled={isStreaming || !conversationId || !authToken}
          />
          <button
            onClick={isStreaming ? handleStop : handleSend}
            disabled={!input.trim() || !conversationId || !authToken}
          >
            {isStreaming ? "Stop" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef } from "react";
import "./App.css";

export default function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef(null);

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    setIsStreaming(true);
    setMessages((prev) => [...prev, { text: input, isUser: true }]);

    // Create an AbortController to allow cancelling the stream
    abortControllerRef.current = new AbortController();

    try {
      // const response = await fetch(
      //   `http://localhost:8080/stream?input=${encodeURIComponent(input)}`,
      //   {
      //     signal: abortControllerRef.current.signal,
      //   }
      // );

      const response = await fetch("http://localhost:8080/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        streamedText += chunk;

        // Update the last message with the streamed text
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && !lastMessage.isUser) {
            return [
              ...prev.slice(0, -1),
              { ...lastMessage, text: streamedText },
            ];
          }
          return [...prev, { text: streamedText, isUser: false }];
        });
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
            disabled={isStreaming}
          />
          <button
            onClick={isStreaming ? handleStop : handleSend}
            disabled={!input.trim()}
          >
            {isStreaming ? "Stop" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

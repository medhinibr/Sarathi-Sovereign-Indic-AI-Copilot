import React, { useState, useRef, useEffect } from "react";
import { 
  BookOpen, 
  Stethoscope, 
  Upload, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  HelpCircle,
  Activity
} from "lucide-react";

// Determine API base URL dynamically based on environment
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Supported Indic languages for target translation
const LANGUAGES = [
  { code: "English", label: "English" },
  { code: "Kannada", label: "ಕನ್ನಡ (Kannada)" },
  { code: "Hindi", label: "हिन्दी (Hindi)" },
  { code: "Tamil", label: "தமிழ் (Tamil)" },
  { code: "Telugu", label: "తెలుగు (Telugu)" },
  { code: "Malayalam", label: "മലയാളം (Malayalam)" },
  { code: "Marathi", label: "मराठी (Marathi)" }
];

// Context-aware suggestion prompts for quick testing
const SUGGESTIONS = {
  education: [
    "Explain the solar system using a cricket match analogy.",
    "What is photosynthesis in simple terms?",
    "How does electricity flow through a wire?"
  ],
  healthcare: [
    "Explain what high cholesterol means for my daily diet.",
    "Simplify a clinical report showing mild hypertension.",
    "What precautions should be taken for type 2 diabetes?"
  ]
};

function App() {
  // App states
  const [mode, setMode] = useState("education"); // 'education' or 'healthcare'
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // File upload states
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("idle"); // 'idle' | 'uploading' | 'success' | 'error'
  const [uploadedFilename, setUploadedFilename] = useState("");
  const [uploadError, setUploadError] = useState("");

  // Voice interaction states
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [playingMessageId, setPlayingMessageId] = useState(null);

  // DOM Refs for scroll handling and input triggering
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to the bottom of the chat on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Handle PDF file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setUploadStatus("error");
        setUploadError("Please upload a PDF file only.");
        return;
      }
      setFile(selectedFile);
      setUploadStatus("idle");
    }
  };

  // Upload PDF to FastAPIs /upload endpoint
  const handleUpload = async () => {
    if (!file) return;

    setUploadStatus("uploading");
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Upload failed");
      }

      const data = await response.json();
      setUploadStatus("success");
      setUploadedFilename(data.filename);
    } catch (err) {
      setUploadStatus("error");
      setUploadError(err.message || "An error occurred during file upload.");
    }
  };

  // Handle message sending
  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    // Append user message locally
    const userMsg = { id: Date.now(), text, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    
    if (!textToSend) setInputMessage(""); // Clear text input if not clicked suggestion
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          mode: mode,
          language: selectedLanguage
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reach server");
      }

      const data = await response.json();
      
      const assistantMsg = {
        id: Date.now() + 1,
        text: data.response,
        sender: "assistant"
      };
      
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        id: Date.now() + 1,
        text: "Error: Unable to get a response from the server. Check your connection and configuration.",
        sender: "system"
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Browser Audio Recording for Speech-to-Text (STT)
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/wav" });
        await handleAudioUpload(audioBlob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone access denied or device not supported.");
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      // Clean up track bindings to release hardware mic
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
  };

  // Sends recorded audio blob to backend /stt endpoint
  const handleAudioUpload = async (audioBlob) => {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.wav");

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/stt`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("STT server error");

      const data = await response.json();
      // Populate text field with transcribed text
      if (data.text) {
        setInputMessage(data.text);
      }
    } catch (err) {
      console.error("STT transaction failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // TTS audio playback handler
  const playTextToSpeech = async (msgId, text) => {
    setPlayingMessageId(msgId);
    try {
      const response = await fetch(`${API_URL}/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          language: selectedLanguage,
        }),
      });

      if (!response.ok) throw new Error("TTS streaming failed");

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setPlayingMessageId(null);
      };
      
      await audio.play();
    } catch (err) {
      console.error("TTS output playback error:", err);
      setPlayingMessageId(null);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      
      {/* Sidebar - Control & File Upload Panel */}
      <div className="w-80 flex flex-col border-r border-slate-800 bg-slate-900/50 p-6 space-y-6">
        
        {/* Logo and branding */}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Sarathi</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Sovereign Indic AI Copilot</p>
        </div>

        {/* Mode Toggle Switch */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operational Mode</label>
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setMode("education")}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all ${
                mode === "education"
                  ? "bg-amber-600/20 text-amber-400 border border-amber-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BookOpen size={14} />
              Education
            </button>
            <button
              onClick={() => setMode("healthcare")}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all ${
                mode === "healthcare"
                  ? "bg-teal-600/20 text-teal-400 border border-teal-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Stethoscope size={14} />
              Healthcare
            </button>
          </div>
        </div>

        {/* Language Selection Dropdown */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Output Language</label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* PDF Document Ingestion Container */}
        <div className="flex-1 flex flex-col min-h-0 space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Knowledge Base PDF</label>
          <div className="flex-1 border border-dashed border-slate-800 rounded-xl p-4 flex flex-col justify-between bg-slate-950/40">
            
            {/* Upload Area */}
            <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf"
                className="hidden"
              />
              
              <Upload 
                size={28} 
                className={`mb-3 ${
                  mode === "education" ? "text-amber-500/60" : "text-teal-500/60"
                }`} 
              />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 underline underline-offset-4 cursor-pointer"
              >
                Choose PDF file
              </button>
              
              {file ? (
                <span className="text-xs text-slate-300 mt-2 truncate max-w-[200px]">
                  {file.name}
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 mt-1">
                  Upload textbook chapters or clinical documents
                </span>
              )}
            </div>

            {/* Upload Controls and Status Messaging */}
            <div className="pt-4 border-t border-slate-800/60 space-y-3">
              {file && uploadStatus !== "success" && (
                <button
                  onClick={handleUpload}
                  disabled={uploadStatus === "uploading"}
                  className={`w-full py-2 rounded-lg text-xs font-semibold transition-all ${
                    mode === "education"
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-teal-600 hover:bg-teal-700 text-white"
                  } disabled:opacity-50 flex items-center justify-center gap-1.5`}
                >
                  {uploadStatus === "uploading" && <Loader2 size={12} className="animate-spin" />}
                  Ingest Document
                </button>
              )}

              {/* Success Notification */}
              {uploadStatus === "success" && (
                <div className="flex items-start gap-2 text-emerald-400 bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-900/30">
                  <CheckCircle size={14} className="mt-0.5 shrink-0" />
                  <div className="text-[11px] leading-tight">
                    <p className="font-semibold">Successfully Indexed</p>
                    <p className="text-slate-400 mt-0.5 truncate max-w-[180px]">{uploadedFilename}</p>
                  </div>
                </div>
              )}

              {/* Error Notification */}
              {uploadStatus === "error" && (
                <div className="flex items-start gap-2 text-rose-400 bg-rose-950/20 p-2.5 rounded-lg border border-rose-900/30">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <div className="text-[11px] leading-tight">
                    <p className="font-semibold">Ingestion Failed</p>
                    <p className="text-slate-400 mt-0.5">{uploadError}</p>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </div>

      </div>

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col bg-slate-950">
        
        {/* Dynamic Mode Header */}
        <div className="h-16 border-b border-slate-800 px-8 flex items-center justify-between bg-slate-900/20">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              mode === "education" ? "bg-amber-500/10 text-amber-400" : "bg-teal-500/10 text-teal-400"
            }`}>
              {mode === "education" ? <BookOpen size={18} /> : <Stethoscope size={18} />}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {mode === "education" ? "Government School Teacher AI" : "Patient Assistant AI"}
              </h2>
              <p className="text-[10px] text-slate-400">
                {mode === "education" ? "Explains complex textbook theories" : "Simplifies diagnostic reports & medical vocabulary"}
              </p>
            </div>
          </div>
          
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Agent Engine Online ({selectedLanguage})
          </div>
        </div>

        {/* Message Feed Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-lg mx-auto text-center space-y-4">
              <div className="p-4 rounded-full bg-slate-900 border border-slate-800">
                {mode === "education" ? (
                  <HelpCircle size={32} className="text-amber-500" />
                ) : (
                  <Activity size={32} className="text-teal-500" />
                )}
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Start a Conversation</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Upload a PDF document on the sidebar first to index it in the local database. 
                  Then, ask questions to get context-specific simplified translations.
                </p>
              </div>

              {/* Suggestion Chips */}
              <div className="grid grid-cols-1 gap-2 pt-2 w-full">
                {SUGGESTIONS[mode].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(suggestion)}
                    className="text-left text-xs p-3 rounded-lg border border-slate-800 bg-slate-900/30 hover:bg-slate-900 hover:border-slate-700 transition-all text-slate-300"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {/* Agent Avatar */}
                {msg.sender !== "user" && (
                  <div className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center ${
                    mode === "education" 
                      ? "bg-amber-600/20 border border-amber-500/30 text-amber-400" 
                      : "bg-teal-600/20 border border-teal-500/30 text-teal-400"
                  }`}>
                    {mode === "education" ? <BookOpen size={16} /> : <Stethoscope size={16} />}
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`max-w-xl rounded-xl p-4 text-sm leading-relaxed border ${
                  msg.sender === "user"
                    ? "bg-indigo-600/10 border-indigo-500/20 text-slate-200"
                    : msg.sender === "system"
                    ? "bg-rose-950/20 border-rose-900/30 text-rose-300"
                    : "bg-slate-900/60 border-slate-800 text-slate-300"
                }`}>
                  <p className="whitespace-pre-line">{msg.text}</p>
                  
                  {/* TTS Trigger Control for Assistant responses */}
                  {msg.sender === "assistant" && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">Audio playback</span>
                      <button
                        onClick={() => playTextToSpeech(msg.id, msg.text)}
                        disabled={playingMessageId !== null}
                        className={`p-1.5 rounded hover:bg-slate-800/80 transition-colors ${
                          playingMessageId === msg.id 
                            ? "text-indigo-400 animate-pulse" 
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Volume2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {msg.sender === "user" && (
                  <div className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
                    <FileText size={16} />
                  </div>
                )}
              </div>
            ))
          )}
          
          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center animate-pulse ${
                mode === "education" ? "bg-amber-600/20 text-amber-400" : "bg-teal-600/20 text-teal-400"
              }`}>
                {mode === "education" ? <BookOpen size={16} /> : <Stethoscope size={16} />}
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex items-center gap-2.5">
                <Loader2 size={16} className="animate-spin text-slate-400" />
                <span className="text-xs text-slate-400">Assistant is synthesizing answer...</span>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar Section */}
        <div className="p-8 border-t border-slate-800 bg-slate-900/10">
          <div className="max-w-3xl mx-auto flex gap-3">
            
            {/* Microphone/STT Toggle Button */}
            <button
              onClick={isRecording ? stopAudioRecording : startAudioRecording}
              className={`p-3.5 rounded-xl border transition-all flex items-center justify-center ${
                isRecording
                  ? "bg-rose-600 border-rose-500 text-white animate-pulse"
                  : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
              title={isRecording ? "Stop recording" : "Record voice query"}
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Input field */}
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder={
                isRecording 
                  ? "Listening to voice input... Click mic button to stop." 
                  : `Ask a question in operational mode...`
              }
              disabled={isRecording}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 placeholder-slate-500 transition-colors disabled:opacity-50"
            />

            {/* Send Button */}
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading || isRecording}
              className={`p-3.5 rounded-xl transition-all ${
                mode === "education"
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-950/20"
                  : "bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-950/20"
              } disabled:opacity-50 flex items-center justify-center`}
            >
              <Send size={16} />
            </button>

          </div>
        </div>

      </div>
      
    </div>
  );
}

export default App;

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AIInterface from "./pages/AIInterface";
import AIInterfaceVoice from "./pages/ai-interface-voice";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Base interface for new conversation */}
        <Route path="/ai-interface" element={<AIInterface />} />
        <Route path="/ai-interface-voice" element={<AIInterfaceVoice />} />

        {/* Existing conversation via ID */}
        <Route path="/ai-interface/c/:conversationId" element={<AIInterface />} />
        <Route path="/ai-interface-voice/c/:conversationId" element={<AIInterfaceVoice />} />
      </Routes>
    </BrowserRouter>

  );
};

export default App;

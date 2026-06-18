import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ConsentPage } from "./pages/ConsentPage";
import { HomePage } from "./pages/HomePage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/oauth/consent" element={<ConsentPage />} />
      </Routes>
    </BrowserRouter>
  );
}

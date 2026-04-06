import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "@/pages/Home";
import Map from "@/pages/Map";
import Workshop from "@/pages/Workshop";
import Districts from "@/pages/Districts";
import Change from "@/pages/Change";
import Run from "@/pages/Run";
import { CityMapStep2 } from "@/components/map/CityMapStep2";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<Map />} />
        <Route path="/map/:env" element={<CityMapStep2 />} />
        <Route path="/districts/:env" element={<Districts />} />
        <Route path="/workshop/:id" element={<Workshop />} />
        <Route path="/changes/:id" element={<Change />} />
        <Route path="/runs/:id" element={<Run />} />
        <Route path="*" element={<Navigate to="/map" replace />} />
      </Routes>
    </Router>
  );
}

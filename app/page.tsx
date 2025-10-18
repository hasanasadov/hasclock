"use client";
import { useEffect, useState } from "react";

export default function Page() {
  const [time, setTime] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [weather, setWeather] = useState<{ temp: number; desc: string } | null>(null);
  const [location, setLocation] = useState<string>("Loading...");
  const [bg, setBg] = useState<string>("from-sky-300 to-blue-500");

  // Saat və tarix yenilənməsi
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      setTime(`${hours}:${minutes}`);
      setDate(
        now.toLocaleDateString("az-AZ", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      );

      // Günün vaxtına görə fon rəngi
      if (hours >= "6" && hours < "12") setBg("from-amber-200 to-yellow-400");
      else if (hours >= "12" && hours < "18") setBg("from-sky-300 to-blue-500");
      else if (hours >= "18" && hours < "22") setBg("from-purple-400 to-pink-600");
      else setBg("from-gray-900 to-slate-800");
    };

    updateTime();
    const interval = setInterval(updateTime, 1000 * 30);
    return () => clearInterval(interval);
  }, []);

  // Hava məlumatı (geolocation + OpenWeather)
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const key = "YOUR_OPENWEATHERMAP_API_KEY"; // <-- öz API açarını buraya yaz
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&lang=az&appid=${key}`
        );
        const data = await res.json();
        setWeather({ temp: Math.round(data.main.temp), desc: data.weather[0].description });
        setLocation(data.name);
      } catch (err) {
        console.error(err);
        setLocation("Naməlum");
      }
    });
  }, []);

  // Günün vaxtına görə “mood” mesajı
  const getMoodMessage = () => {
    const hour = new Date().getHours();
    if (hour < 6) return "Sakit gecə — dərin nəfəs al və rahatla 🌙";
    if (hour < 12) return "Səhər enerjisi — günə gülümsəyərək başla ☀️";
    if (hour < 18) return "İrəlilə, bu gün sənin günündür 💪";
    return "Axşam səssizliyi — özünlə qal və düşün 🌇";
  };

  return (
    <main
      className={`flex flex-col items-center justify-center h-screen w-full text-white bg-gradient-to-br ${bg} transition-all duration-700`}
    >
      {/* Hava və tarix */}
      <div className="absolute top-6 left-6 text-sm md:text-base opacity-80">
        <p className="font-medium">{location}</p>
        {weather && (
          <p>
            {weather.temp}°C — {weather.desc.charAt(0).toUpperCase() + weather.desc.slice(1)}
          </p>
        )}
      </div>

      <div className="absolute top-6 right-6 text-right text-sm md:text-base opacity-80">
        <p>{date}</p>
      </div>

      {/* Saat */}
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-[100px] md:text-[160px] font-light tracking-tight drop-shadow-lg">
          {time}
        </h1>
        <p className="text-lg md:text-2xl mt-4 italic opacity-90">{getMoodMessage()}</p>
      </div>

      {/* Aşağıda sitat və ya əlavə məlumat (opsional) */}
      <footer className="absolute bottom-6 text-xs md:text-sm opacity-60 text-center px-4">
        “Zaman sənin ən dəyərli sərvətindir — onu hiss et.” ⏳
      </footer>
    </main>
  );
}

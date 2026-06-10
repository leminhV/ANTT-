import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "next-themes";

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Toaster position="top-right" />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

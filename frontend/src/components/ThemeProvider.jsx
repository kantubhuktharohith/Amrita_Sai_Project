import { createContext, useContext, useEffect, useState } from "react";
const ThemeContext = createContext({
    theme: "light",
    toggle: () => { },
});
// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);
export const ThemeProvider = ({ children }) => {
    const [theme] = useState("light");
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove("dark");
        try {
            localStorage.setItem("theme", "light");
        }
        catch {
            // ignore
        }
    }, []);
    const toggle = () => { };
    return (<ThemeContext.Provider value={{ theme: "light", toggle }}>
      {children}
    </ThemeContext.Provider>);
};

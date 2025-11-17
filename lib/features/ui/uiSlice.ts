import { createAppSlice } from "@/lib/createAppSlice";

type Theme = "light" | "dark";

interface UiState {
  theme: Theme;
  sidebarOpen: boolean;
}

const initialState: UiState = {
  theme: "dark",
  sidebarOpen: true,
};

export const uiSlice = createAppSlice({
  name: "ui",
  initialState,
  reducers: (create) => ({
    toggleTheme: create.reducer((state) => {
      state.theme = state.theme === "dark" ? "light" : "dark";
    }),
    setTheme: create.reducer((state, action: { payload: Theme }) => {
      state.theme = action.payload;
    }),
    toggleSidebar: create.reducer((state) => {
      state.sidebarOpen = !state.sidebarOpen;
    }),
    setSidebarOpen: create.reducer((state, action: { payload: boolean }) => {
      state.sidebarOpen = action.payload;
    }),
  }),
});

export const { toggleTheme, setTheme, toggleSidebar, setSidebarOpen } =
  uiSlice.actions;


import { render, screen } from "@testing-library/react-native";
import App from "../App";

test("shows login screen", () => {
  render(<App />);
  expect(screen.getByText("NoteSync")).toBeTruthy();
});

import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { App } from "./main";

test("shows login view", () => {
  localStorage.clear();
  render(<App />);
  expect(screen.getByText("NoteSync")).toBeTruthy();
});

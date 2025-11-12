/// <reference types="@testing-library/jest-dom" />

import { render, screen, renderHook, act } from "@testing-library/react";
import { expect, test, describe, beforeEach, vi } from "vitest";
import { InactifyProvider, InactifyContext } from "../src";
import { useContext } from "react";

describe("InactifyProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  test("renders children correctly", () => {
    const TestChild = () => <div data-testid="test-child">Test Content</div>;
    render(
      <InactifyProvider>
        <TestChild />
      </InactifyProvider>
    );

    expect(screen.getByTestId("test-child")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  test("provides correct context methods", () => {
    const { result } = renderHook(() => useContext(InactifyContext), {
      wrapper: InactifyProvider,
    });

    expect(result.current).toBeDefined();
    expect(typeof result.current?.markActive).toBe("function");
    expect(typeof result.current?.updateLastActive).toBe("function");
    expect(typeof result.current?.lastActive).toBe("function");
  });

  test("initializes lastActive as now", () => {
    const { result } = renderHook(() => useContext(InactifyContext), {
      wrapper: InactifyProvider,
    });

    expect(result.current?.lastActive()).toBe(Date.now());
  });

  test("markActive updates the lastActive timestamp", () => {
    const { result } = renderHook(() => useContext(InactifyContext), {
      wrapper: InactifyProvider,
    });

    const mockTime = new Date("2025-01-01");
    vi.setSystemTime(mockTime);

    act(() => {
      result.current?.markActive();
    });

    expect(result.current?.lastActive()).toBe(mockTime.getTime());
  });

  test("updateLastActive sets specific timestamp", () => {
    const { result } = renderHook(() => useContext(InactifyContext), {
      wrapper: InactifyProvider,
    });

    const mockDate = new Date("2025-01-01");

    act(() => {
      result.current?.updateLastActive(mockDate);
    });

    expect(result.current?.lastActive()).toBe(mockDate.getTime());
  });
});

import React, { useEffect, useRef, useState } from 'react';
import { Text, useInput, useStdout } from 'ink';

type SingleLineInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  focus?: boolean;
  mask?: string;
};

type VisibleRange = {
  start: number;
  end: number;
  leftTruncated: boolean;
  rightTruncated: boolean;
};

function getVisibleRange(valueLength: number, cursorOffset: number, width: number): VisibleRange {
  const availableChars = Math.max(1, width - 1);
  let start = Math.max(0, cursorOffset - availableChars);
  let end = Math.min(valueLength, start + availableChars);

  if (end - start < availableChars) {
    start = Math.max(0, end - availableChars);
  }

  let leftTruncated = start > 0;
  let rightTruncated = end < valueLength;
  const markerChars = Number(leftTruncated) + Number(rightTruncated);
  const usableChars = Math.max(1, availableChars - markerChars);

  start = Math.max(0, cursorOffset - usableChars);
  end = Math.min(valueLength, start + usableChars);

  if (end - start < usableChars) {
    start = Math.max(0, end - usableChars);
  }

  leftTruncated = start > 0;
  rightTruncated = end < valueLength;

  return { start, end, leftTruncated, rightTruncated };
}

export default function SingleLineInput({
  value,
  onChange,
  onSubmit,
  placeholder = '',
  focus = true,
  mask,
}: SingleLineInputProps) {
  const { stdout } = useStdout();
  const [cursorOffset, setCursorOffset] = useState(value.length);
  const valueRef = useRef(value);
  const cursorOffsetRef = useRef(value.length);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!focus) {
      return;
    }

    setCursorOffset(previousCursorOffset => {
      const nextCursorOffset = Math.min(previousCursorOffset, value.length);
      cursorOffsetRef.current = nextCursorOffset;
      return nextCursorOffset;
    });
  }, [focus, value]);

  useInput((input, key) => {
    if (
      key.upArrow ||
      key.downArrow ||
      (key.ctrl && input === 'c') ||
      key.tab ||
      (key.shift && key.tab)
    ) {
      return;
    }

    if (key.return) {
      onSubmit(valueRef.current);
      return;
    }

    const currentCursorOffset = cursorOffsetRef.current;
    const currentValue = valueRef.current;
    let nextCursorOffset = currentCursorOffset;
    let nextValue = currentValue;

    if (key.leftArrow) {
      nextCursorOffset = Math.max(0, currentCursorOffset - 1);
    } else if (key.rightArrow) {
      nextCursorOffset = Math.min(currentValue.length, currentCursorOffset + 1);
    } else if (key.backspace || key.delete) {
      if (currentCursorOffset > 0) {
        nextValue = currentValue.slice(0, currentCursorOffset - 1) + currentValue.slice(currentCursorOffset);
        nextCursorOffset = currentCursorOffset - 1;
      }
    } else if (input.length > 0) {
      nextValue = currentValue.slice(0, currentCursorOffset) + input + currentValue.slice(currentCursorOffset);
      nextCursorOffset = currentCursorOffset + input.length;
    }

    valueRef.current = nextValue;
    cursorOffsetRef.current = nextCursorOffset;
    setCursorOffset(nextCursorOffset);

    if (nextValue !== currentValue) {
      onChange(nextValue);
    }
  }, { isActive: focus });

  const prefix = '> ';
  const availableWidth = Math.max(12, (stdout.columns ?? 80) - prefix.length - 4);
  const renderedValue = mask ? mask.repeat(value.length) : value;

  if (renderedValue.length === 0) {
    const visiblePlaceholder = placeholder.slice(0, Math.max(0, availableWidth - 1));

    return (
      <Text>
        {prefix}
        <Text inverse> </Text>
        {visiblePlaceholder.length > 0 && <Text dimColor>{visiblePlaceholder}</Text>}
      </Text>
    );
  }

  const { start, end, leftTruncated, rightTruncated } = getVisibleRange(
    renderedValue.length,
    cursorOffset,
    availableWidth,
  );
  const beforeCursor = renderedValue.slice(start, Math.min(cursorOffset, end));
  const cursorCharacter = renderedValue[cursorOffset] ?? ' ';
  const afterCursor = renderedValue.slice(
    Math.min(cursorOffset + (cursorOffset < renderedValue.length ? 1 : 0), end),
    end,
  );

  return (
    <Text>
      {prefix}
      {leftTruncated && <Text dimColor>{'<'}</Text>}
      {beforeCursor}
      <Text inverse>{cursorCharacter}</Text>
      {afterCursor}
      {rightTruncated && <Text dimColor>{'>'}</Text>}
    </Text>
  );
}

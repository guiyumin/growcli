import React, { useRef, useState } from 'react';
import { Box, Text, useInput } from 'ink';

export type MultiSelectItem = {
  label: string;
  value: string;
};

type MultiSelectProps = {
  items: MultiSelectItem[];
  onSubmit: (selectedValues: string[]) => void;
  initialSelectedValues?: string[];
};

export default function MultiSelect({
  items,
  onSubmit,
  initialSelectedValues,
}: MultiSelectProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [selectedValues, setSelectedValues] = useState<string[]>(
    initialSelectedValues ?? items.map(item => item.value),
  );
  const selectedValuesRef = useRef(selectedValues);

  useInput((input, key) => {
    if (items.length === 0) {
      return;
    }

    if (key.upArrow) {
      setHighlightedIndex(index => (index === 0 ? items.length - 1 : index - 1));
      return;
    }

    if (key.downArrow) {
      setHighlightedIndex(index => (index === items.length - 1 ? 0 : index + 1));
      return;
    }

    if (input === ' ') {
      const currentValue = items[highlightedIndex].value;
      setSelectedValues(values =>
        (values.includes(currentValue)
          ? values.filter(value => value !== currentValue)
          : [...values, currentValue]),
      );
      selectedValuesRef.current = selectedValuesRef.current.includes(currentValue)
        ? selectedValuesRef.current.filter(value => value !== currentValue)
        : [...selectedValuesRef.current, currentValue];
      return;
    }

    if (input.toLowerCase() === 'a') {
      const nextValues = selectedValuesRef.current.length === items.length
        ? []
        : items.map(item => item.value);
      selectedValuesRef.current = nextValues;
      setSelectedValues(nextValues);
      return;
    }

    if (key.return) {
      onSubmit(selectedValuesRef.current);
    }
  });

  return (
    <Box flexDirection="column">
      {items.map((item, index) => {
        const isHighlighted = index === highlightedIndex;
        const isSelected = selectedValues.includes(item.value);

        return (
          <Text key={item.value} color={isHighlighted ? 'cyan' : undefined}>
            {isHighlighted ? '›' : ' '} [{isSelected ? 'x' : ' '}] {item.label}
          </Text>
        );
      })}
    </Box>
  );
}

import { useState } from "react";

export const useForm = <T extends object>(initialState: T) => {
  const [data, setData] = useState<T>(initialState);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement
    > | { target: { name: string; value: string } }
  ) => {
    const { name, value } = e.target;
    setData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setData(initialState);
  };

  const setFormData = (newData: Partial<T>) => {
    setData((prev) => ({
      ...prev,
      ...newData,
    }));
  };

  return { data, handleChange, resetForm, setFormData };
};

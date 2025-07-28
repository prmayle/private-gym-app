"use client";

import React from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import "@/styles/phone-input.css";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	required?: boolean;
	id?: string;
}

export function PhoneInputField({
	value,
	onChange,
	placeholder = "Enter phone number",
	className,
	disabled = false,
	required = false,
	id,
}: PhoneInputProps) {
	return (
		<div
			className={cn(
				"flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
				className
			)}>
			<PhoneInput
				id={id}
				international
				defaultCountry="LB"
				value={value}
				onChange={onChange}
				placeholder={placeholder}
				disabled={disabled}
				required={required}
			/>
		</div>
	);
}

import React from "react";
import { Toast } from "../components/ui";

export default function ToastComponent({ type, message, onClose }) {
    return <Toast type={type} message={message} onClose={onClose} />;
}

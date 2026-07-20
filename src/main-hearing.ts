import "./style.css";
import { mount } from "./hearing-app";

const root = document.getElementById("app");
if (!root) throw new Error("#app root element not found");
mount(root);

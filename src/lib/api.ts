import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();

const API_BASE = 'https://super-duper-waffle-rypd.onrender.com/';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  });
  
  if (!res.ok) {
    let message = 'Erro na requisição';
    try {
      const data = await res.json();
      message = data.mensagem || message;
    } catch (e) {}
    throw new Error(message);
  }
  
  return res.json();
}

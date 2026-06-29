import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { RefreshCw, X, Package, PackagePlus, Minus } from "lucide-react";
import { toast } from "sonner";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchApi } from "@/lib/api";

interface Posicao {
  id: number;
  coluna: string;
  nivel: number;
  lado: string;
  num_paletes: number;
  id_palete: number | null;   // ID do palete alocado (null se vazio)
  disponivel: boolean;        // true se sem paletes
}

interface Item {
  id: number;
  palete_id: number;
  descricao: string;
  codigo_pa: string;
  lote: string;
  data_validade: string;
  quantidade: number;
}

interface PaleteItens {
  id_palete: number;
  itens: Item[];
}

interface ModalData {
  posicao: Posicao;
  paletes: PaleteItens[];
}

// Célula vazia = transparente, ocupada = amarelo, 2+ = vermelho
function cellColor(num: number) {
  if (num === 0) return "bg-transparent border-border/40 text-muted-foreground/50";
  if (num === 1) return "bg-yellow-500/80 border-yellow-400 text-yellow-950 shadow-[0_0_8px_rgba(234,179,8,0.5)]";
  return "bg-red-600/80 border-red-400 text-red-100 shadow-[0_0_8px_rgba(220,38,38,0.5)]";
}

function WarehouseGrid({
  posicoes,
  lado,
  onSelect,
  highlightPosicaoId,
}: {
  posicoes: Posicao[];
  lado: string;
  onSelect: (p: Posicao) => void;
  highlightPosicaoId?: number | null;
}) {
  const filtered = posicoes.filter((p) => p.lado === lado);
  const colunas = [...new Set(filtered.map((p) => p.coluna))].sort();
  const niveis = [...new Set(filtered.map((p) => p.nivel))].sort((a, b) => b - a);

  if (colunas.length === 0) {
    return (
      <p className="text-muted-foreground text-xs text-center py-4 uppercase tracking-widest">
        Sem posições cadastradas
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-center text-xs">
        <thead>
          <tr>
            <th className="w-8 text-muted-foreground/60 font-bold uppercase tracking-widest pb-1">Nv</th>
            {colunas.map((col) => (
              <th key={col} className="text-muted-foreground/60 font-bold uppercase tracking-widest pb-1 px-0.5">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {niveis.map((nivel) => (
            <tr key={nivel}>
              <td className="text-muted-foreground/50 font-bold pr-1 text-[10px]">{nivel}</td>
              {colunas.map((col) => {
                const pos = filtered.find((p) => p.coluna === col && p.nivel === nivel);
                if (!pos) {
                  return (
                    <td key={col} className="p-0.5">
                      <div className="h-9 w-full rounded border border-dashed border-border/20" />
                    </td>
                  );
                }
                return (
                  <td key={col} className="p-0.5">
                    <button
                      onClick={() => onSelect(pos)}
                      title={
                        pos.num_paletes > 0
                          ? `${col}${nivel} — Palete #${pos.id_palete}`
                          : `${col}${nivel} — Vazio`
                      }
                      className={`h-9 w-full rounded border-2 font-bold transition-all active:scale-95 hover:opacity-90 text-[10px] leading-tight px-0.5
                        ${cellColor(pos.num_paletes)}
                        ${highlightPosicaoId === pos.id ? "ring-2 ring-offset-1 ring-white animate-pulse" : ""}`}
                    >
                      {/* FIX 3: mostra o ID do palete, não a contagem */}
                      {pos.id_palete != null ? `#${pos.id_palete}` : ""}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Modal({
  data,
  onClose,
  onAlocar,
  onBaixaSuccess,
}: {
  data: ModalData;
  onClose: () => void;
  onAlocar: (pos: Posicao) => void;
  onBaixaSuccess: () => void;
}) {
  const { posicao, paletes } = data;
  const [qtds, setQtds] = useState<Record<number, string>>({});
  const [loadingItem, setLoadingItem] = useState<number | null>(null);

  const handleBaixa = async (item: Item) => {
    const qtd = Number(qtds[item.id] ?? 0);
    if (!qtd || qtd <= 0) { toast.error("Informe uma quantidade válida"); return; }
    if (qtd > item.quantidade) {
      toast.error(`Quantidade máxima disponível: ${item.quantidade}`);
      return;
    }
    setLoadingItem(item.id);
    try {
      const resp = await fetchApi("/palete/baixar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_item: item.id, quantidade_retirada: qtd }),
      });
      toast.success(resp.mensagem || "Baixa realizada!");
      setQtds((prev) => ({ ...prev, [item.id]: "" }));
      onBaixaSuccess();
    } catch (err: any) {
      toast.error(err.message || "Erro ao dar baixa");
    } finally {
      setLoadingItem(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-md bg-card border border-border rounded-t-2xl p-5 space-y-4 max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Posição</p>
            <h3 className="text-2xl font-bold text-primary">
              {posicao.coluna}{posicao.nivel} — {posicao.lado}
            </h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        <Button
          className="w-full h-12 text-sm font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(255,204,0,0.25)]"
          onClick={() => { onAlocar(posicao); onClose(); }}
        >
          <PackagePlus className="mr-2 h-4 w-4" /> Alocar Palete Aqui
        </Button>

        {paletes.length === 0 ? (
          <p className="text-muted-foreground text-center py-6 uppercase tracking-widest text-sm">
            Posição vazia
          </p>
        ) : (
          paletes.map(({ id_palete, itens }) => (
            <div key={id_palete} className="border border-border rounded-lg overflow-hidden">
              <div className="bg-primary/10 border-b border-border px-4 py-2 flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <span className="font-bold text-primary text-sm uppercase tracking-widest">
                  Palete #{id_palete}
                </span>
              </div>
              {itens.length === 0 ? (
                <p className="text-muted-foreground text-sm p-3">Sem itens</p>
              ) : (
                itens.map((item) => (
                  <div key={item.id} className="px-4 py-3 border-b border-border/50 last:border-0 space-y-3">
                    <div className="space-y-1">
                      <p className="font-bold leading-tight">{item.descricao}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        <span>Cód: <span className="text-foreground font-bold">{item.codigo_pa}</span></span>
                        <span>Lote: <span className="text-foreground font-bold">{item.lote}</span></span>
                        <span>Val: <span className="text-foreground font-bold">{item.data_validade}</span></span>
                      </div>
                      <p className="text-sm">
                        Estoque: <span className="font-bold text-primary text-base">{item.quantidade}</span>
                        <span className="text-muted-foreground"> un</span>
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number" inputMode="numeric" min={1} max={item.quantidade}
                        placeholder="Qtd"
                        value={qtds[item.id] ?? ""}
                        onChange={(e) => setQtds((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        className="h-11 text-lg font-bold text-center bg-input/50 border-2 focus-visible:border-destructive w-28 shrink-0"
                      />
                      <Button
                        variant="destructive"
                        className="flex-1 h-11 font-bold uppercase tracking-widest text-sm"
                        disabled={loadingItem === item.id}
                        onClick={() => handleBaixa(item)}
                      >
                        <Minus className="mr-1 h-4 w-4" />
                        {loadingItem === item.id ? "Aguarde..." : "Dar Baixa"}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ))
        )}

        <Button variant="outline" className="w-full h-12 uppercase tracking-widest" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
}

export default function MapaPage() {
  const [posicoes, setPosicoes] = useState<Posicao[]>([]);
  const [disponiveis, setDisponiveis] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalData | null>(null);
  const [loadingModal, setLoadingModal] = useState(false);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [, navigate] = useLocation();

  const handleAlocar = (pos: Posicao) => {
    const params = new URLSearchParams({
      coluna: pos.coluna, nivel: String(pos.nivel), lado: pos.lado,
    });
    navigate(`/recebimento?${params.toString()}`);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi("/mapa");
      setPosicoes(data.posicoes || []);
      // FIX 3: backend agora envia total e disponiveis calculados
      setTotal(data.total ?? (data.posicoes || []).length);
      setDisponiveis(data.disponiveis ?? (data.posicoes || []).filter((p: Posicao) => p.disponivel).length);
    } catch {
      toast.error("Erro ao carregar mapa");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Abre automaticamente a posição destacada (vindo do redirecionamento de duplicata)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("highlight");
    if (id) {
      setHighlightId(Number(id));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Quando as posições carregarem e houver um highlight, abre o modal da posição
  useEffect(() => {
    if (highlightId && posicoes.length > 0) {
      const pos = posicoes.find((p) => p.id === highlightId);
      if (pos) {
        handleSelect(pos);
        setHighlightId(null);
      }
    }
  }, [highlightId, posicoes]);

  const handleSelect = async (pos: Posicao) => {
    setLoadingModal(true);
    try {
      const data = await fetchApi(`/posicao/${pos.id}/itens`);
      setModal({ posicao: pos, paletes: data.paletes || [] });
    } catch {
      toast.error("Erro ao consultar posição");
    } finally {
      setLoadingModal(false);
    }
  };

  const handleBaixaSuccess = useCallback(async () => {
    if (!modal) return;
    try {
      const [mapaData, posData] = await Promise.all([
        fetchApi("/mapa"),
        fetchApi(`/posicao/${modal.posicao.id}/itens`),
      ]);
      setPosicoes(mapaData.posicoes || []);
      setTotal(mapaData.total ?? 0);
      setDisponiveis(mapaData.disponiveis ?? 0);
      setModal((prev) => prev ? { ...prev, paletes: posData.paletes || [] } : null);
    } catch { /* toast já exibido */ }
  }, [modal]);

  const ocupadas = posicoes.filter((p) => p.num_paletes > 0).length;
  const lados = ["Esquerdo", "Direito"];

  return (
    <Layout>
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-display font-bold uppercase tracking-wider text-primary">Mapa</h2>
            <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">Armazém Pulmão</p>
          </div>
          <button
            onClick={load} disabled={loading}
            className="text-muted-foreground hover:text-primary transition-colors p-2"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Legenda */}
        <div className="flex gap-4 text-xs font-bold uppercase tracking-widest">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border border-border/40 bg-transparent" />
            <span className="text-muted-foreground">Vazio</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border-2 border-yellow-400 bg-yellow-500/80" />
            <span className="text-muted-foreground">1 Palete</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border-2 border-red-400 bg-red-600/80" />
            <span className="text-muted-foreground">2 Paletes</span>
          </div>
        </div>

        {/* Stats — FIX 3: Disponíveis em destaque, debita conforme ocupação */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Disponíveis", value: disponiveis, color: "text-green-400" },
            { label: "Ocupadas", value: ocupadas, color: "text-yellow-400" },
            { label: "Total", value: total, color: "text-muted-foreground" },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-lg py-3">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Grids */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground uppercase tracking-widest text-sm animate-pulse">
            Carregando mapa...
          </div>
        ) : (
          lados.map((lado) => (
            <div key={lado} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
                Lado {lado}
              </p>
              <WarehouseGrid posicoes={posicoes} lado={lado} onSelect={handleSelect} highlightPosicaoId={highlightId} />
            </div>
          ))
        )}

        {loadingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <p className="text-primary font-bold uppercase tracking-widest animate-pulse">Consultando...</p>
          </div>
        )}
      </div>

      {modal && (
        <Modal
          data={modal}
          onClose={() => setModal(null)}
          onAlocar={handleAlocar}
          onBaixaSuccess={handleBaixaSuccess}
        />
      )}
    </Layout>
  );
}

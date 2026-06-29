import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Camera, FileText, CheckCircle2, Plus, Minus,
  Trash2, PackagePlus, AlertTriangle, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchApi } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ItemConfirmado {
  descricao: string;
  codigo_pa: string;
  lote: string;
  data_validade: string;
  quantidade: number;
}

type Etapa = "form" | "confirmando" | "sucesso";

interface PaleteExistenteInfo {
  id_palete: number;
  posicao_id: number;
  posicao_str: string;
}

// ---------------------------------------------------------------------------
// Schema do formulário de posição
// ---------------------------------------------------------------------------
const schema = z.object({
  id_palete: z.coerce.number().min(1, "Número do palete obrigatório"),
  coluna: z.string().min(1, "Coluna obrigatória").toUpperCase(),
  nivel: z.coerce.number().min(1, "Nível obrigatório"),
  lado: z.enum(["Esquerdo", "Direito"], { required_error: "Selecione o lado" }),
});
type FormData = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Componente: confirmação de um item escaneado
// ---------------------------------------------------------------------------
function ItemCard({
  item,
  index,
  onUpdate,
  onRemove,
}: {
  item: ItemConfirmado;
  index: number;
  onUpdate: (i: number, field: keyof ItemConfirmado, value: string | number) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="bg-muted px-4 py-2 flex items-center justify-between border-b border-border">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Produto {index + 1}
        </span>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-destructive hover:opacity-70 p-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-3">
        {/* Descrição */}
        <div className="space-y-1">
          <Label className="text-xs uppercase font-bold tracking-widest text-muted-foreground">
            Descrição
          </Label>
          <Input
            value={item.descricao}
            onChange={(e) => onUpdate(index, "descricao", e.target.value)}
            className="font-bold"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs uppercase font-bold tracking-widest text-muted-foreground">
              Código PA
            </Label>
            <Input
              value={item.codigo_pa}
              onChange={(e) => onUpdate(index, "codigo_pa", e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase font-bold tracking-widest text-muted-foreground">
              Lote
            </Label>
            <Input
              value={item.lote}
              onChange={(e) => onUpdate(index, "lote", e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase font-bold tracking-widest text-muted-foreground">
              Validade
            </Label>
            <Input
              value={item.data_validade}
              onChange={(e) => onUpdate(index, "data_validade", e.target.value)}
              className="font-mono"
            />
          </div>
          {/* Quantidade com +/− */}
          <div className="space-y-1">
            <Label className="text-xs uppercase font-bold tracking-widest text-muted-foreground">
              Quantidade
            </Label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onUpdate(index, "quantidade", Math.max(1, item.quantidade - 1))}
                className="h-10 w-10 shrink-0 rounded border-2 border-border flex items-center justify-center hover:border-primary transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={item.quantidade}
                onChange={(e) => onUpdate(index, "quantidade", Number(e.target.value) || 1)}
                className="h-10 text-center font-bold text-lg"
              />
              <button
                type="button"
                onClick={() => onUpdate(index, "quantidade", item.quantidade + 1)}
                className="h-10 w-10 shrink-0 rounded border-2 border-border flex items-center justify-center hover:border-primary transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal de aviso de lote duplicado
// ---------------------------------------------------------------------------
function ModalLoteDuplicado({
  lote,
  descricao,
  onConfirm,
  onCancel,
}: {
  lote: string;
  descricao: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-card border-2 border-yellow-400 rounded-2xl p-6 max-w-sm w-full space-y-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-yellow-400 shrink-0" />
          <div>
            <p className="font-bold uppercase tracking-widest text-sm">Lote duplicado</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              O lote <span className="font-mono font-bold text-foreground">{lote}</span> já foi
              adicionado para <span className="font-bold">{descricao}</span>.
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Deseja mesmo adicionar outro produto com o mesmo lote neste palete?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-12 font-bold uppercase tracking-widest" onClick={onCancel}>
            Cancelar
          </Button>
          <Button className="h-12 font-bold uppercase tracking-widest" onClick={onConfirm}>
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal: palete já existe — pergunta se quer adicionar produtos a ele
// ---------------------------------------------------------------------------
function ModalPaleteExistente({
  info,
  onAdicionar,
  onCancelar,
}: {
  info: PaleteExistenteInfo;
  onAdicionar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-card border-2 border-primary rounded-2xl p-6 max-w-sm w-full space-y-4">
        <div className="space-y-1">
          <p className="font-bold uppercase tracking-widest text-primary text-sm">
            Palete já alocado
          </p>
          <p className="text-2xl font-bold">#{info.id_palete}</p>
          <p className="text-sm text-muted-foreground">
            Este palete já está na posição{" "}
            <span className="font-bold text-foreground">{info.posicao_str}</span>.
          </p>
        </div>
        <p className="text-sm text-muted-foreground border-t border-border pt-3">
          Deseja <span className="font-bold text-foreground">adicionar novos produtos</span> a este
          palete existente?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-12 font-bold uppercase tracking-widest"
            onClick={onCancelar}
          >
            Cancelar
          </Button>
          <Button
            className="h-12 font-bold uppercase tracking-widest"
            onClick={onAdicionar}
          >
            Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}


// ===========================================================================
// Componente principal
// ===========================================================================
export default function RecebimentoPage() {
  const [, navigate] = useLocation();

  // Form de posição
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue, getValues } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: { id_palete: undefined, coluna: "", nivel: undefined, lado: undefined },
    });
  const ladoValue = watch("lado");

  // Estado do fluxo
  const [etapa, setEtapa] = useState<Etapa>("form");
  const [itensConfirmados, setItensConfirmados] = useState<ItemConfirmado[]>([]);
  const [palletId, setPalletId] = useState<number | null>(null);
  const [resultMsg, setResultMsg] = useState("");

  // Scanner de nova etiqueta
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modal de lote duplicado
  const [pendingItem, setPendingItem] = useState<ItemConfirmado | null>(null);
  const [showLoteDuplicado, setShowLoteDuplicado] = useState(false);

  // Modal de palete já existente
  const [paleteExistente, setPaleteExistente] = useState<PaleteExistenteInfo | null>(null);
  // Quando true, os itens escaneados serão adicionados ao palete existente (não cria novo)
  const [modoAdicionar, setModoAdicionar] = useState(false);

  // Pré-preenche posição a partir de URL params (vindo do Mapa)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const coluna = params.get("coluna");
    const nivel = params.get("nivel");
    const lado = params.get("lado") as "Esquerdo" | "Direito" | null;
    if (coluna) setValue("coluna", coluna);
    if (nivel) setValue("nivel", Number(nivel));
    if (lado && (lado === "Esquerdo" || lado === "Direito")) setValue("lado", lado);
    if (coluna || nivel || lado) window.history.replaceState({}, "", window.location.pathname);
  }, [setValue]);

  // Lida com seleção de foto
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Escaneia a etiqueta atual via IA
  const handleScanEtiqueta = async () => {
    if (!file) {
      toast.error("Tire uma foto da etiqueta primeiro");
      return;
    }
    setIsScanning(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const dados = await fetchApi("/palete/escanear", { method: "POST", body: formData });

      const novoItem: ItemConfirmado = {
        descricao: dados.descricao || "",
        codigo_pa: dados.codigo_pa || "",
        lote: dados.lote || "",
        data_validade: dados.data_validade || "",
        quantidade: Number(dados.quantidade) || 0,
      };

      // Verifica lote duplicado
      const loteJaExiste = itensConfirmados.some(
        (i) => i.lote && i.lote === novoItem.lote && i.descricao === novoItem.descricao
      );

      if (loteJaExiste) {
        setPendingItem(novoItem);
        setShowLoteDuplicado(true);
      } else {
        setItensConfirmados((prev) => [...prev, novoItem]);
        setFile(null);
        setPreview(null);
        toast.success("Produto adicionado! Verifique os dados.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao escanear etiqueta");
    } finally {
      setIsScanning(false);
    }
  };

  // Confirma lote duplicado
  const handleConfirmLoteDuplicado = () => {
    if (pendingItem) {
      setItensConfirmados((prev) => [...prev, pendingItem]);
      setFile(null);
      setPreview(null);
      toast.success("Produto adicionado mesmo com lote duplicado.");
    }
    setShowLoteDuplicado(false);
    setPendingItem(null);
  };

  // Atualiza campo de um item
  const handleUpdateItem = (index: number, field: keyof ItemConfirmado, value: string | number) => {
    setItensConfirmados((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setItensConfirmados((prev) => prev.filter((_, i) => i !== index));
  };

  // Salva tudo no backend
  const handleSalvar = async () => {
    if (itensConfirmados.length === 0) {
      toast.error("Adicione pelo menos um produto");
      return;
    }
    if (itensConfirmados.some((i) => i.quantidade <= 0)) {
      toast.error("Todos os produtos precisam ter quantidade maior que zero");
      return;
    }

    const formValues = getValues();
    setIsSaving(true);
    try {
      let resp: any;

      if (modoAdicionar && paleteExistente) {
        // ── Adiciona itens a palete JÁ EXISTENTE ──
        resp = await fetchApi(`/palete/${paleteExistente.id_palete}/itens`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itens: itensConfirmados }),
        });
        setPalletId(paleteExistente.id_palete);
      } else {
        // ── Cria NOVO palete ──
        resp = await fetchApi("/palete/adicionar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_palete: formValues.id_palete,
            coluna: formValues.coluna.toUpperCase(),
            nivel: formValues.nivel,
            lado: formValues.lado,
            itens: itensConfirmados,
          }),
        });
        setPalletId(formValues.id_palete);
      }

      setResultMsg(resp.mensagem || "Palete salvo com sucesso!");
      setEtapa("sucesso");
      toast.success(resp.mensagem);
    } catch (err: any) {
      // Palete duplicado — pergunta se quer adicionar produtos a ele
      const is409 =
        err.status === 409 ||
        err.statusCode === 409 ||
        err.message?.includes("409") ||
        String(err.detail ?? "").includes("posicao_id");

      if (is409) {
        try {
          const raw = err.detail ?? err.message ?? "{}";
          const detalhe = typeof raw === "string" && raw.startsWith("{") ? JSON.parse(raw) : raw;
          setPaleteExistente({
            id_palete: detalhe?.id_palete ?? formValues.id_palete,
            posicao_id: detalhe?.posicao_id,
            posicao_str: detalhe?.posicao_str ?? "posição desconhecida",
          });
        } catch {
          toast.error("Palete já cadastrado no sistema.");
        }
        return;
      }
      toast.error(err.message || "Erro ao salvar palete");
    } finally {
      setIsSaving(false);
    }
  };

  // Confirmação: adicionar ao palete existente
  const handleConfirmarAdicionar = () => {
    setModoAdicionar(true);
    setPaleteExistente(null); // fecha o modal, mantém os dados
  };

  // Cancelar: fecha modal e limpa o ID para o operador digitar outro
  const handleCancelarExistente = () => {
    setPaleteExistente(null);
    setModoAdicionar(false);
  };

  // Impressão de etiqueta
  const handlePrint = () => {
    if (palletId) window.open(`/api/palete/${palletId}/etiqueta`, "_blank");
  };

  // Reinicia tudo
  const handleNovo = () => {
    setEtapa("form");
    setItensConfirmados([]);
    setPalletId(null);
    setResultMsg("");
    setFile(null);
    setPreview(null);
    setModoAdicionar(false);
    setPaleteExistente(null);
    reset();
  };

  // =========================================================================
  // RENDER: TELA DE SUCESSO
  // =========================================================================
  if (etapa === "sucesso") {
    return (
      <Layout>
        <div className="space-y-6 max-w-md mx-auto">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-display font-bold uppercase tracking-wider text-primary">
              Recebimento
            </h2>
          </div>

          <Card className="border-primary border-2 bg-card/50">
            <CardHeader className="bg-primary/10 border-b border-primary/20 pb-4">
              <CardTitle className="flex items-center gap-2 text-primary uppercase tracking-widest text-lg">
                <CheckCircle2 className="w-6 h-6" />
                Palete {palletId} Salvo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {resultMsg && (
                <p className="text-sm text-center font-bold text-muted-foreground uppercase tracking-widest">
                  {resultMsg}
                </p>
              )}

              {/* Lista de itens salvos */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Produtos no palete
                </p>
                {itensConfirmados.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-muted/30 border border-border rounded-lg px-4 py-3 space-y-1"
                  >
                    <p className="font-bold leading-tight">{item.descricao}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Lote: <span className="font-mono text-foreground">{item.lote}</span></span>
                      <span>Val: <span className="font-mono text-foreground">{item.data_validade}</span></span>
                      <span className="ml-auto font-bold text-primary text-sm">{item.quantidade} un</span>
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={handlePrint} variant="outline" className="w-full h-12 font-bold uppercase tracking-widest">
                <FileText className="mr-2 h-5 w-5" /> IMPRIMIR ETIQUETA
              </Button>
              <Button
                onClick={handleNovo}
                className="w-full h-14 text-lg font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(255,204,0,0.3)]"
              >
                NOVO RECEBIMENTO
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // =========================================================================
  // RENDER: FORMULÁRIO
  // =========================================================================
  return (
    <Layout>
      <div className="space-y-6 max-w-md mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-display font-bold uppercase tracking-wider text-primary">
            Recebimento
          </h2>
          <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
            Entrada de Paletes
          </p>
        </div>

        <form onSubmit={handleSubmit(() => setEtapa("confirmando"))} className="space-y-5">

          {/* Banner modo adicionar */}
          {modoAdicionar && paleteExistente === null && (
            <div className="flex items-center gap-3 bg-primary/10 border-2 border-primary rounded-xl px-4 py-3">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary">
                  Modo: adicionar ao palete existente
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Os produtos escaneados serão adicionados ao Palete #{getValues("id_palete")} já alocado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setModoAdicionar(false); }}
                className="ml-auto text-muted-foreground hover:text-foreground text-xs font-bold uppercase"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Número do Palete */}
          <div className="space-y-2">
            <Label htmlFor="id_palete" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">
              Número do Palete
            </Label>
            <Input
              id="id_palete" type="number" inputMode="numeric" placeholder="Ex: 1234"
              className="h-16 text-2xl font-bold bg-input/50 border-2 focus-visible:border-primary"
              {...register("id_palete")}
            />
            {errors.id_palete && (
              <p className="text-destructive text-sm font-bold">{errors.id_palete.message}</p>
            )}
          </div>

          {/* Coluna + Nível */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="coluna" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">
                Coluna
              </Label>
              <Input
                id="coluna" type="text" placeholder="Ex: A" maxLength={3}
                className="h-14 text-2xl font-bold text-center bg-input/50 border-2 focus-visible:border-primary uppercase"
                {...register("coluna")}
              />
              {errors.coluna && (
                <p className="text-destructive text-sm font-bold">{errors.coluna.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nivel" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">
                Nível
              </Label>
              <Input
                id="nivel" type="number" inputMode="numeric" placeholder="Ex: 1"
                className="h-14 text-2xl font-bold text-center bg-input/50 border-2 focus-visible:border-primary"
                {...register("nivel")}
              />
              {errors.nivel && (
                <p className="text-destructive text-sm font-bold">{errors.nivel.message}</p>
              )}
            </div>
          </div>

          {/* Lado */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Lado</Label>
            <div className="grid grid-cols-2 gap-3">
              {(["Esquerdo", "Direito"] as const).map((opcao) => (
                <label
                  key={opcao}
                  className={`flex items-center justify-center h-14 rounded-lg border-2 cursor-pointer font-bold uppercase tracking-widest text-sm transition-all
                    ${ladoValue === opcao
                      ? "border-primary bg-primary text-primary-foreground shadow-[0_0_12px_rgba(255,204,0,0.4)]"
                      : "border-border bg-input/50 text-muted-foreground hover:border-primary/50"}`}
                >
                  <input type="radio" value={opcao} {...register("lado")} className="sr-only" />
                  {opcao}
                </label>
              ))}
            </div>
            {errors.lado && (
              <p className="text-destructive text-sm font-bold">{errors.lado.message}</p>
            )}
          </div>

          {/* Foto da etiqueta */}
          <div className="space-y-2 pt-1">
            <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">
              Foto da Etiqueta
            </Label>
            <div className="relative h-40 border-2 border-dashed border-border rounded-lg bg-input/20 overflow-hidden group hover:border-primary/50 transition-colors">
              <input
                type="file" accept="image/*" capture="environment"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              {preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                  <Camera className="w-10 h-10 mb-2" />
                  <span className="font-bold uppercase tracking-widest text-sm">TIRAR FOTO</span>
                </div>
              )}
            </div>
          </div>

          {/* Botão Escanear */}
          <Button
            type="button"
            disabled={isScanning || !file}
            onClick={handleScanEtiqueta}
            variant="secondary"
            className="w-full h-12 font-bold uppercase tracking-widest border-2"
          >
            {isScanning ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> LENDO ETIQUETA...</>
            ) : (
              <><Camera className="mr-2 h-4 w-4" /> ESCANEAR ETIQUETA</>
            )}
          </Button>

          {/* Itens já adicionados */}
          {itensConfirmados.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Produtos adicionados ({itensConfirmados.length})
                </p>
              </div>
              {itensConfirmados.map((item, idx) => (
                <ItemCard
                  key={idx}
                  item={item}
                  index={idx}
                  onUpdate={handleUpdateItem}
                  onRemove={handleRemoveItem}
                />
              ))}
            </div>
          )}

          {/* Botão Salvar — só aparece quando tem itens */}
          {itensConfirmados.length > 0 && (
            <Button
              type="button"
              onClick={handleSalvar}
              disabled={isSaving}
              className="w-full h-16 text-xl font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(255,204,0,0.3)]"
            >
              {isSaving ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> SALVANDO...</>
              ) : (
                <><PackagePlus className="mr-2 h-5 w-5" /> SALVAR PALETE ({itensConfirmados.length} produto{itensConfirmados.length > 1 ? "s" : ""})</>
              )}
            </Button>
          )}
        </form>
      </div>

      {/* Modal de lote duplicado */}
      {showLoteDuplicado && pendingItem && (
        <ModalLoteDuplicado
          lote={pendingItem.lote}
          descricao={pendingItem.descricao}
          onConfirm={handleConfirmLoteDuplicado}
          onCancel={() => { setShowLoteDuplicado(false); setPendingItem(null); }}
        />
      )}

      {/* Modal de palete existente */}
      {paleteExistente && (
        <ModalPaleteExistente
          info={paleteExistente}
          onAdicionar={handleConfirmarAdicionar}
          onCancelar={handleCancelarExistente}
        />
      )}
    </Layout>
  );
}
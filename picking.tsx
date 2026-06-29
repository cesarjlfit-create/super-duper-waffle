import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Search, QrCode, AlertCircle, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { fetchApi } from "@/lib/api";
import { Html5Qrcode } from "html5-qrcode";

export default function PickingPage() {
  const [palletId, setPalletId] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [palletData, setPalletData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [withdrawAmounts, setWithdrawAmounts] = useState<Record<number, string>>({});
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Limpa o scanner ao desmontar o componente
  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const toggleScanner = async () => {
    if (isScanning) {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
      setIsScanning(false);
      return;
    }

    setIsScanning(true);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            scanner.stop();
            setIsScanning(false);
            setPalletId(decodedText);
            handleSearch(decodedText); // Pesquisa automaticamente após leitura
          },
          () => {}
        );
      } catch {
        toast.error("Erro ao iniciar câmera");
        setIsScanning(false);
      }
    }, 100);
  };

  // FIX 1: agora chama /palete/consulta/${id} que existe no backend
  const handleSearch = async (id: string = palletId) => {
    const idLimpo = id.trim();
    if (!idLimpo) {
      toast.error("Informe o ID do palete");
      return;
    }
    setIsLoading(true);
    setPalletData(null);
    try {
      const data = await fetchApi(`/palete/consulta/${idLimpo}`);
      setPalletData(data);
      setWithdrawAmounts({});
    } catch (err: any) {
      toast.error(err.message || "Palete não encontrado");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async (itemId: number) => {
    const amount = Number(withdrawAmounts[itemId]);
    if (!amount || amount <= 0) {
      toast.error("Informe uma quantidade válida");
      return;
    }

    // Verifica saldo disponível antes de enviar
    const item = palletData?.itens?.find((i: any) => i.id === itemId);
    if (item && amount > item.quantidade) {
      toast.error(`Quantidade máxima disponível: ${item.quantidade}`);
      return;
    }

    try {
      const resp = await fetchApi("/palete/baixar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_item: itemId, quantidade_retirada: amount }),
      });
      toast.success(resp.mensagem || "Baixa realizada com sucesso!");
      setWithdrawAmounts((prev) => ({ ...prev, [itemId]: "" }));
      handleSearch(); // Atualiza os dados do palete
    } catch (err: any) {
      toast.error(err.message || "Erro ao realizar baixa");
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-md mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-display font-bold uppercase tracking-wider text-primary">
            Picking
          </h2>
          <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
            Retirada de Material
          </p>
        </div>

        {/* Busca */}
        <Card className="border-border">
          <CardContent className="pt-6 space-y-4">
            {isScanning ? (
              <div className="space-y-4">
                <div
                  id="reader"
                  className="w-full overflow-hidden rounded-lg border-2 border-primary"
                />
                <Button variant="outline" className="w-full" onClick={toggleScanner}>
                  CANCELAR LEITURA
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="ID DO PALETE"
                  className="h-14 text-xl font-bold bg-input/50"
                  value={palletId}
                  onChange={(e) => setPalletId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  data-testid="input-search-pallet"
                />
                <Button
                  onClick={() => handleSearch()}
                  className="h-14 px-6"
                  disabled={isLoading}
                  data-testid="btn-search"
                >
                  {isLoading ? (
                    <span className="animate-spin text-lg">⟳</span>
                  ) : (
                    <Search className="w-6 h-6" />
                  )}
                </Button>
                <Button
                  variant="secondary"
                  className="h-14 px-6 border-2 border-secondary-border"
                  onClick={toggleScanner}
                  data-testid="btn-scan-qr"
                >
                  <QrCode className="w-6 h-6 text-primary" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resultados */}
        {palletData && (
          <div className="space-y-4">
            <h3 className="font-display font-bold uppercase text-lg border-b border-border pb-2 flex items-center gap-2">
              <PackageOpen className="w-5 h-5" />
              Itens do Palete {palletData.palete?.id}
              {palletData.palete?.posicao && (
                <span className="text-sm text-muted-foreground font-normal ml-auto">
                  {palletData.palete.posicao}
                </span>
              )}
            </h3>

            {palletData.itens?.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-muted-foreground bg-card/50 rounded-lg border border-border">
                <AlertCircle className="w-12 h-12 mb-2 opacity-50" />
                <p className="font-bold uppercase tracking-widest text-center">Palete Vazio</p>
              </div>
            ) : (
              palletData.itens?.map((item: any) => (
                <Card key={item.id} className="border-border overflow-hidden">
                  <div className="bg-muted px-4 py-2 border-b border-border flex justify-between items-center">
                    <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">
                      ID: {item.id}
                    </span>
                    <span className="text-xs uppercase tracking-widest font-bold text-primary">
                      SALDO: {item.quantidade}
                    </span>
                  </div>
                  <CardContent className="p-4 space-y-4">
                    <p className="text-xl font-bold leading-tight">{item.descricao}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-background p-2 rounded border border-border">
                        <span className="text-xs text-muted-foreground block uppercase font-bold">
                          Lote
                        </span>
                        <span className="font-mono">{item.lote || "-"}</span>
                      </div>
                      <div className="bg-background p-2 rounded border border-border">
                        <span className="text-xs text-muted-foreground block uppercase font-bold">
                          Validade
                        </span>
                        <span className="font-mono">{item.data_validade || "-"}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-background p-4 border-t border-border flex gap-2">
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="QTD"
                      min={1}
                      max={item.quantidade}
                      className="h-14 text-xl font-bold text-center"
                      value={withdrawAmounts[item.id] || ""}
                      onChange={(e) =>
                        setWithdrawAmounts((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      data-testid={`input-withdraw-${item.id}`}
                    />
                    <Button
                      variant="destructive"
                      className="h-14 px-8 font-bold text-lg"
                      onClick={() => handleWithdraw(item.id)}
                      data-testid={`btn-withdraw-${item.id}`}
                    >
                      RETIRAR
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
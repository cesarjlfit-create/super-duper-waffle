import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Download, Layers } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Item {
  id: number;
  palete_id: number;
  posicao: string;
  descricao: string;
  codigo_pa: string;
  lote: string;
  data_validade: string;
  quantidade: number;
}

export default function InventarioPage() {
  const [data, setData] = useState<{ itens: Item[]; total: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // /inventario agora retorna { itens, total } com campo "posicao" em cada item
      const res = await fetchApi("/inventario");
      setData(res);
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar inventário");
    } finally {
      setIsLoading(false);
    }
  };

  // FIX 4: chama o endpoint /inventario/exportar que agora existe no backend
  const handleExport = () => {
    // Abre em nova aba — o browser fará o download automático do .xlsx
    window.open("/api/inventario/exportar", "_blank");
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-3xl font-display font-bold uppercase tracking-wider text-primary">
              Inventário
            </h2>
            <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
              Visão Geral do Estoque
            </p>
          </div>
          <Button
            onClick={handleExport}
            className="w-full sm:w-auto h-12 uppercase tracking-widest font-bold"
            data-testid="btn-export"
          >
            <Download className="mr-2 h-5 w-5" /> EXPORTAR EXCEL
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg bg-muted/50" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Contador total */}
            <div className="bg-card border border-border p-4 rounded-lg flex items-center justify-between">
              <span className="uppercase tracking-widest font-bold text-muted-foreground text-sm flex items-center gap-2">
                <Layers className="w-4 h-4" /> Total de Itens
              </span>
              <span className="text-2xl font-bold text-primary">{data?.total ?? 0}</span>
            </div>

            {/* Lista de itens */}
            <div className="space-y-3">
              {data?.itens?.map((item) => (
                <div
                  key={item.id}
                  className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3"
                >
                  <div className="flex justify-between items-start gap-4">
                    <p className="font-bold leading-tight">{item.descricao}</p>
                    <div className="bg-primary/20 text-primary px-3 py-1 rounded text-lg font-bold shrink-0">
                      {item.quantidade}
                    </div>
                  </div>

                  {/* 4 campos: posição agora populada pelo backend */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground uppercase font-bold block mb-1">
                        Posição
                      </span>
                      <span className="font-mono bg-muted px-2 py-1 rounded block">
                        {item.posicao || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground uppercase font-bold block mb-1">
                        Palete
                      </span>
                      <span className="font-mono bg-muted px-2 py-1 rounded block">
                        {item.palete_id || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground uppercase font-bold block mb-1">
                        Lote
                      </span>
                      <span className="font-mono bg-muted px-2 py-1 rounded block">
                        {item.lote || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground uppercase font-bold block mb-1">
                        Validade
                      </span>
                      <span className="font-mono bg-muted px-2 py-1 rounded block">
                        {item.data_validade || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {(!data?.itens || data.itens.length === 0) && (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                  Nenhum item no inventário.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
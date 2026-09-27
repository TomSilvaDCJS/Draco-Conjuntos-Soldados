import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Shield, Camera, Bot, RefreshCw, Cpu, Send, PlusCircle } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');

export default function App() {
  const [ops, setOps] = useState([]);
  const [apontamentos, setApontamentos] = useState([]);
  const [aba, setAba] = useState('ops');

  // Formulário de Nova OP
  const [numeroOp, setNumeroOp] = useState('');
  const [cliente, setCliente] = useState('');
  const [codigoDesenho, setCodigoDesenho] = useState('');
  const [material, setMaterial] = useState('');
  const [espessura, setEspessura] = useState('');
  const [qtd, setQtd] = useState(1);

  // Inspeção com Foto
  const [opSelecionada, setOpSelecionada] = useState(null);
  const [operador, setOperador] = useState('');
  const [etapa, setEtapa] = useState('CORTE_LASER');
  const [obs, setObs] = useState('');
  const [fotoBase64, setFotoBase64] = useState(null);

  // Chat com Robô Groq
  const [mensagensChat, setMensagensChat] = useState([
    { autor: 'ia', texto: 'Olá! Sou o Robô de Processos da Draco Laser. Como posso te ajudar hoje?' }
  ]);
  const [inputChat, setInputChat] = useState('');
  const [carregandoIA, setCarregandoIA] = useState(false);

  useEffect(() => {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      carregarDados();

      const channel = supabase
        .channel('realtime-draco')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ordens_servico' }, () => carregarDados())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'apontamentos_qualidade' }, () => carregarDados())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  async function carregarDados() {
    const { data: dataOps } = await supabase.from('ordens_servico').select('*').order('created_at', { ascending: false });
    const { data: dataApt } = await supabase.from('apontamentos_qualidade').select('*').order('created_at', { ascending: false });
    if (dataOps) setOps(dataOps);
    if (dataApt) setApontamentos(dataApt);
  }

  async function criarOP(e) {
    e.preventDefault();
    await supabase.from('ordens_servico').insert([
      {
        numero_op: numeroOp,
        cliente,
        codigo_desenho: codigoDesenho,
        material,
        espessura_mm: Number(espessura),
        quantidade: Number(qtd)
      }
    ]);
    setNumeroOp(''); setCliente(''); setCodigoDesenho(''); setMaterial(''); setEspessura(''); setQtd(1);
    setAba('ops');
    carregarDados();
  }

  const capturarFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(img, 0, 0);

        const dataHora = new Date().toLocaleString('pt-BR');
        const textoMarca = `DRACO LASER | OP: ${opSelecionada?.numero_op} | ETAPA: ${etapa} | DATA: ${dataHora} | OPERADOR: ${operador || 'N/A'}`;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, canvas.height - 80, canvas.width, 80);

        ctx.fillStyle = '#f97316';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(textoMarca, 20, canvas.height - 30);

        setFotoBase64(canvas.toDataURL('image/jpeg'));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  async function salvarInspecao() {
    if (!operador) return alert('Por favor, informe o nome do operador.');

    await supabase.from('apontamentos_qualidade').insert([
      {
        op_id: opSelecionada.id,
        etapa,
        operador_nome: operador,
        observacao: obs,
        foto_url: fotoBase64
      }
    ]);

    setOpSelecionada(null);
    setFotoBase64(null);
    setOperador('');
    setObs('');
    carregarDados();
  }

  async function enviarParaAgenteGroq(e) {
    e.preventDefault();
    if (!inputChat.trim()) return;

    const msgUser = inputChat;
    setMensagensChat((prev) => [...prev, { autor: 'user', texto: msgUser }]);
    setInputChat('');
    setCarregandoIA(true);

    const contexto = { ordens_de_servico: ops, ultimas_inspecoes: apontamentos.slice(0, 5) };

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `Você é o Robô Industrial de IA da Draco Laser. Responda com precisão técnica usando os dados do banco: ${JSON.stringify(contexto)}`
            },
            { role: "user", content: msgUser }
          ]
        })
      });

      const data = await response.json();
      const respostaTexto = data.choices[0].message.content;

      setMensagensChat((prev) => [...prev, { autor: 'ia', texto: respostaTexto }]);
    } catch (err) {
      setMensagensChat((prev) => [...prev, { autor: 'ia', texto: 'Erro ao conectar ao Robô Groq. Verifique a API Key.' }]);
    } finally {
      setCarregandoIA(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans max-w-xl mx-auto pb-10">
      <header className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Shield className="text-orange-500 w-7 h-7" />
          <div>
            <h1 className="font-bold text-lg text-orange-500 leading-none">DRACO LASER</h1>
            <span className="text-[10px] text-slate-400">SGM & Groq AI Engine</span>
          </div>
        </div>
        <button onClick={carregarDados} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600">
          <RefreshCw className="w-4 h-4 text-slate-300" />
        </button>
      </header>

      <nav className="flex border-b border-slate-700 bg-slate-800/60">
        <button onClick={() => setAba('ops')} className={`flex-1 py-3 text-xs font-bold ${aba === 'ops' ? 'border-b-2 border-orange-500 text-orange-400' : 'text-slate-400'}`}>
          ORDENS (OP)
        </button>
        <button onClick={() => setAba('nova_op')} className={`flex-1 py-3 text-xs font-bold ${aba === 'nova_op' ? 'border-b-2 border-orange-500 text-orange-400' : 'text-slate-400'}`}>
          + NOVA OP
        </button>
        <button onClick={() => setAba('agente')} className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1 ${aba === 'agente' ? 'border-b-2 border-orange-500 text-orange-400' : 'text-slate-400'}`}>
          <Bot className="w-3.5 h-3.5" /> ROBÔ GROQ
        </button>
      </nav>

      <main className="p-4">
        {aba === 'agente' && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 h-[68vh] flex flex-col">
            <div className="p-3 bg-slate-800/80 border-b border-slate-700 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-orange-500" />
              <h2 className="text-sm font-bold">Assistente de Processos</h2>
            </div>
            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              {mensagensChat.map((msg, index) => (
                <div key={index} className={`flex ${msg.autor === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-xl text-xs ${msg.autor === 'user' ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                    {msg.texto}
                  </div>
                </div>
              ))}
              {carregandoIA && <p className="text-xs text-slate-400 italic">Robô consultando dados...</p>}
            </div>
            <form onSubmit={enviarParaAgenteGroq} className="p-2 border-t border-slate-700 flex gap-2">
              <input
                type="text" placeholder="Pergunte sobre uma OP ou material..." value={inputChat} onChange={(e) => setInputChat(e.target.value)}
                className="flex-1 bg-slate-700 p-2.5 rounded-lg text-xs text-white focus:outline-none"
              />
              <button type="submit" className="bg-orange-600 p-2.5 rounded-lg text-white">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {aba === 'ops' && (
          <div className="space-y-3">
            {ops.map((op) => (
              <div key={op.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono font-bold bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">OP: {op.numero_op}</span>
                    <h3 className="font-bold text-base mt-1">{op.cliente}</h3>
                    <p className="text-xs text-slate-400">Desenho: {op.codigo_desenho}</p>
                    <p className="text-xs text-slate-300">Material: {op.material} ({op.espessura_mm} mm) - {op.quantidade} pçs</p>
                  </div>
                </div>
                <div className="pt-2">
                  <button onClick={() => setOpSelecionada(op)} className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded text-xs font-bold flex items-center justify-center gap-1 text-orange-400">
                    <Camera className="w-4 h-4" /> Apontar Qualidade / Foto
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {aba === 'nova_op' && (
          <form onSubmit={criarOP} className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-3">
            <h2 className="text-sm font-bold text-slate-200">Cadastrar Nova OP</h2>
            <input type="text" required placeholder="Número da OP (ex: OP-1020)" value={numeroOp} onChange={(e) => setNumeroOp(e.target.value)} className="w-full bg-slate-700 p-2.5 rounded text-sm focus:outline-none" />
            <input type="text" required placeholder="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} className="w-full bg-slate-700 p-2.5 rounded text-sm focus:outline-none" />
            <input type="text" required placeholder="Código do Desenho" value={codigoDesenho} onChange={(e) => setCodigoDesenho(e.target.value)} className="w-full bg-slate-700 p-2.5 rounded text-sm focus:outline-none" />
            <div className="flex gap-2">
              <input type="text" required placeholder="Material (ex: Inox 304)" value={material} onChange={(e) => setMaterial(e.target.value)} className="flex-1 bg-slate-700 p-2.5 rounded text-sm focus:outline-none" />
              <input type="number" step="0.1" required placeholder="Espessura mm" value={espessura} onChange={(e) => setEspessura(e.target.value)} className="w-28 bg-slate-700 p-2.5 rounded text-sm focus:outline-none" />
            </div>
            <button type="submit" className="w-full bg-orange-600 font-bold p-3 rounded text-sm">Salvar Nova OP</button>
          </form>
        )}
      </main>

      {opSelecionada && (
        <div className="fixed inset-0 bg-black/80 p-4 flex items-center justify-center z-50">
          <div className="bg-slate-800 w-full max-w-md p-4 rounded-2xl border border-slate-700 space-y-3">
            <h3 className="font-bold text-base text-orange-400">Inspeção - OP: {opSelecionada.numero_op}</h3>
            <input type="text" placeholder="Nome do Operador" value={operador} onChange={(e) => setOperador(e.target.value)} className="w-full bg-slate-700 p-2.5 rounded text-xs" />
            <select value={etapa} onChange={(e) => setEtapa(e.target.value)} className="w-full bg-slate-700 p-2.5 rounded text-xs text-white">
              <option value="CORTE_LASER">Corte Laser</option>
              <option value="DOBRA">Dobra CNC</option>
              <option value="SOLDA">Solda</option>
              <option value="PINTURA">Pintura</option>
              <option value="CONTROLE_QUALIDADE">Controle de Qualidade Final</option>
            </select>
            <textarea placeholder="Observações" value={obs} onChange={(e) => setObs(e.target.value)} className="w-full bg-slate-700 p-2.5 rounded text-xs h-16" />
            <input type="file" accept="image/*" capture="environment" onChange={capturarFoto} className="text-xs text-slate-300" />
            {fotoBase64 && <img src={fotoBase64} alt="Marca D'água" className="w-full h-auto rounded border border-slate-600 mt-2" />}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setOpSelecionada(null)} className="flex-1 bg-slate-700 p-2 rounded text-xs">Cancelar</button>
              <button onClick={salvarInspecao} className="flex-1 bg-emerald-600 p-2 rounded text-xs font-bold">Salvar Inspeção</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

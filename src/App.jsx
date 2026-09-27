import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { 
  Calculator, 
  Bot, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  Send, 
  Settings, 
  Layers, 
  Zap,
  Clock
} from 'lucide-react'

// Configuração do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null

export default function App() {
  const [activeTab, setActiveTab] = useState('orcamento')
  const [material, setMaterial] = useState('inox')
  const [espessura, setEspessura] = useState('2mm')
  const [tempoEstimado, setTempoEstimado] = useState(15)
  const [quantidade, setQuantidade] = useState(1)
  const [valorCalculado, setValorCalculado] = useState(null)
  
  // Chat IA Groq
  const [mensagens, setMensagens] = useState([
    { role: 'assistant', text: 'Olá! Sou o assistente técnico da Draco Laser. Como posso ajudar com seu projeto de corte ou gravação a laser hoje?' }
  ])
  const [inputChat, setInputChat] = useState('')
  const [carregandoIA, setCarregandoIA] = useState(false)

  // Cálculo de orçamento básico
  const calcularOrcamento = (e) => {
    e.preventDefault()
    let precoBaseMinuto = 12.00
    if (material === 'inox') precoBaseMinuto = 18.50
    if (material === 'aluminio') precoBaseMinuto = 15.00
    
    const total = (tempoEstimado * precoBaseMinuto * quantidade)
    setValorCalculado(total.toFixed(2))
  }

  // Pergunta para a IA Groq
  const enviarParaGroq = async (e) => {
    e.preventDefault()
    if (!inputChat.trim()) return

    const novaMensagem = { role: 'user', text: inputChat }
    setMensagens((prev) => [...prev, novaMensagem])
    const textoPerguntado = inputChat
    setInputChat('')
    setCarregandoIA(true)

    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY
      if (!apiKey) {
        throw new Error('Chave VITE_GROQ_API_KEY não configurada')
      }

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'Você é um especialista em corte e gravação a laser industrial da empresa Draco Laser. Responda com clareza, precisão e foco técnico sobre materiais (Inox, Aço Carbono, Alumínio, MDF, Acrílico), tolerâncias e orçamentos.'
            },
            { role: 'user', content: textoPerguntado }
          ]
        })
      })

      const data = await res.json()
      const respostaIA = data.choices?.[0]?.message?.content || 'Não foi possível gerar uma resposta no momento.'
      setMensagens((prev) => [...prev, { role: 'assistant', text: respostaIA }])
    } catch (err) {
      setMensagens((prev) => [...prev, { role: 'assistant', text: 'Erro ao conectar à IA Groq. Verifique suas variáveis de ambiente na Vercel.' }])
    } finally {
      setCarregandoIA(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Topo / Header Industrial */}
      <header className="bg-slate-900 border-b-2 border-emerald-500 p-4 shadow-xl">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500 p-2.5 rounded-xl text-slate-950 font-black flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wider text-white flex items-center gap-2">
                DRACO <span className="text-emerald-400 font-light">LASER</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">Corte & Gravação Industrial de Alta Precisão</p>
            </div>
          </div>

          {/* Menu Superior */}
          <nav className="flex items-center bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setActiveTab('orcamento')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'orcamento'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Calculator className="w-4 h-4" /> Orçamentador
            </button>

            <button
              onClick={() => setActiveTab('assistente')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'assistente'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Bot className="w-4 h-4" /> Assistente IA
            </button>
          </nav>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 grid gap-6">
        {activeTab === 'orcamento' && (
          <div className="grid md:grid-cols-12 gap-6">
            {/* Formulário de Cálculo */}
            <div className="md:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6">
                <Layers className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">Simulador de Corte Laser</h2>
              </div>

              <form onSubmit={calcularOrcamento} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Tipo de Material
                  </label>
                  <select
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="inox">Aço Inoxidável (Inox 304/316)</option>
                    <option value="carbono">Aço Carbono / Ferro</option>
                    <option value="aluminio">Alumínio Naval / Comercial</option>
                    <option value="mdf">MDF / Madeira</option>
                    <option value="acrilico">Acrílico Cast</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Espessura
                    </label>
                    <select
                      value={espessura}
                      onChange={(e) => setEspessura(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="1mm">1.0 mm</option>
                      <option value="2mm">2.0 mm</option>
                      <option value="3mm">3.0 mm</option>
                      <option value="6mm">6.0 mm</option>
                      <option value="10mm">10.0 mm</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Quantidade (Peças)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantidade}
                      onChange={(e) => setQuantidade(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Tempo Estimado de Corte por Peça (Minutos)
                  </label>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-slate-500" />
                    <input
                      type="number"
                      min="1"
                      value={tempoEstimado}
                      onChange={(e) => setTempoEstimado(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 mt-4"
                >
                  <Sparkles className="w-5 h-5" /> Calcular Estimativa
                </button>
              </form>
            </div>

            {/* Painel do Resultado */}
            <div className="md:col-span-5 flex flex-col gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Resumo do Pedido</span>
                    <span className="text-xs text-slate-400">Draco Laser Calc</span>
                  </div>

                  <div className="space-y-3 text-sm text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Material selecionado:</span>
                      <span className="font-semibold text-white capitalize">{material} ({espessura})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Quantidade de peças:</span>
                      <span className="font-semibold text-white">{quantidade} un.</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tempo total estimado:</span>
                      <span className="font-semibold text-white">{tempoEstimado * quantidade} min.</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 mt-6">
                  <span className="text-xs text-slate-400 block mb-1">Valor Total Estimado</span>
                  <div className="text-3xl font-black text-emerald-400">
                    {valorCalculado ? `R$ ${valorCalculado}` : 'R$ 0,00'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    *Valores de referência sujeitos a análise de desenho técnico (.DXF/.DWG).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assistente' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col h-[600px] overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Consultor Técnico Draco Laser (IA)</h3>
                <p className="text-xs text-slate-400">Tire dúvidas sobre chapas, tolerâncias e viabilidade</p>
              </div>
            </div>

            {/* Caixa de Mensagens */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {mensagens.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-emerald-500 text-slate-950 font-medium rounded-br-none'
                        : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {carregandoIA && (
                <div className="flex justify-start">
                  <div className="bg-slate-950 border border-slate-800 text-slate-400 rounded-2xl p-4 text-sm">
                    Analisando parâmetros técnicos...
                  </div>
                </div>
              )}
            </div>

            {/* Input de Envio */}
            <form onSubmit={enviarParaGroq} className="p-4 border-t border-slate-800 bg-slate-950/60 flex gap-2">
              <input
                type="text"
                placeholder="Ex: Qual a tolerância para corte de Inox 3mm?"
                value={inputChat}
                onChange={(e) => setInputChat(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="submit"
                disabled={carregandoIA}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-3 rounded-xl transition-all flex items-center justify-center disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Rodapé */}
      <footer className="border-t border-slate-800/80 p-4 text-center text-xs text-slate-500">
        Draco Laser © 2026 • Sistema de Gestão e Orçamentos de Precisão
      </footer>
    </div>
  )
}

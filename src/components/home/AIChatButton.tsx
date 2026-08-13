import { useState, useRef, useCallback } from 'react'
import { X, Send, MessageCircle } from 'lucide-react'

/**
 * AIChatButton - 独立的AI聊天按钮
 * 放在工具箱旁边（左下角）
 */

const AGNES_API_KEY = 'sk-bs7hzNgQ8mszRpnNJWz3g4bAPAHQAKRdHFtGuzUQ2vul6JPK'
const AGNES_API_URL = 'https://api.agnes.ai/v1/chat/completions'

async function fetchAgnesResponse(messages: Array<{ role: string; content: string }>): Promise<string> {
  try {
    const res = await fetch(AGNES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AGNES_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '你是一只可爱的猫娘看板娘，名字叫喵音。你说话带有猫娘风格，会用"喵～"等语气词，性格温柔可爱，喜欢撒娇。回答要简短可爱，不超过100字。',
          },
          ...messages,
        ],
        temperature: 0.8,
        max_tokens: 200,
      }),
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content || '喵～主人说什么都对喵～(≧▽≦)'
  } catch {
    return '喵～网络好像出了点问题，等一下再试试吧～'
  }
}

export function AIChatButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([
    { role: 'ai', text: '喵呜～主人好呀！我是喵音小筑的猫娘看板娘，有什么想聊的吗？喵～ 🐱♡' },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const handleSend = useCallback(async () => {
    if (!input.trim() || isTyping) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }])
    setIsTyping(true)

    const chatHistory = [...messages, { role: 'user' as const, text: userMessage }]
      .map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))

    const aiResponse = await fetchAgnesResponse(chatHistory)
    setMessages((prev) => [...prev, { role: 'ai', text: aiResponse }])
    setIsTyping(false)
  }, [input, isTyping, messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 left-20 z-50 w-80 sm:w-96 animate-slide-up">
          <div className="rounded-3xl overflow-hidden shadow-2xl shadow-black/20
            bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl
            border border-slate-200/50 dark:border-slate-700/50">
            {/* 头部 */}
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <MessageCircle size={20} className="text-white" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">喵音猫娘</div>
                    <div className="text-xs text-white/70">在线 · 随时陪聊喵～</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>
            </div>

            {/* 消息 */}
            <div className="h-80 overflow-y-auto p-4 space-y-3 bg-pink-50/50 dark:bg-slate-900"
              onScroll={scrollToBottom}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && (
                    <div className="w-7 h-7 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center shrink-0 mr-2 mt-1">
                      <span className="text-sm">🐱</span>
                    </div>
                  )}
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-pink-500 text-white rounded-br-md'
                      : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-bl-md shadow-sm border border-pink-100 dark:border-gray-700'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center shrink-0 mr-2">
                    <span className="text-sm">🐱</span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-pink-100 dark:border-gray-700">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 快捷回复 */}
            <div className="px-4 py-2 flex gap-2 overflow-x-auto bg-white dark:bg-slate-800 border-t border-pink-100 dark:border-gray-700">
              {['你好', '摸摸', '音乐', '二次元', '猫'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setInput(tag)}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-900/50 transition-colors whitespace-nowrap"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* 输入框 */}
            <div className="p-3 bg-white dark:bg-slate-800 border-t border-pink-100 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="和猫娘聊天喵～"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-pink-50 dark:bg-slate-700
                    text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400
                    focus:outline-none focus:ring-2 focus:ring-pink-500/30 transition-all"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center
                    text-white hover:bg-pink-600 transition-colors
                    disabled:opacity-40"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className="fixed bottom-6 left-20 z-50 w-12 h-12 rounded-2xl
          bg-gradient-to-br from-pink-500 to-purple-500
          flex items-center justify-center
          shadow-lg shadow-pink-500/30
          hover:shadow-xl hover:shadow-pink-500/40 hover:scale-110
          active:scale-95 transition-all duration-300"
        title="和猫娘聊天"
      >
        <MessageCircle size={20} className="text-white" />
      </button>
    </>
  )
}

export default AIChatButton

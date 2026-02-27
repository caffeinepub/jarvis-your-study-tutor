import { useState } from 'react';
import { MapPin, Loader2, Calculator, Copy, Check } from 'lucide-react';
import { useGemini } from '../hooks/useGemini';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface MindNode {
  text: string;
  level: number;
  color: string;
}

const NODE_COLORS = [
  'text-blue-400 border-blue-500/50',
  'text-green-400 border-green-500/50',
  'text-purple-400 border-purple-500/50',
  'text-yellow-400 border-yellow-500/50',
  'text-pink-400 border-pink-500/50',
  'text-teal-400 border-teal-500/50',
];

function parseMindMap(text: string): MindNode[] {
  const lines = text.split('\n').filter((l) => l.trim());
  return lines.map((line) => {
    const trimmed = line.trim();
    const spaces = line.length - line.trimStart().length;
    const level = Math.floor(spaces / 2);
    const colorIdx = level % NODE_COLORS.length;
    return {
      text: trimmed.replace(/^(MAIN TOPIC:|Branch \d+:|Sub:)\s*/i, ''),
      level,
      color: NODE_COLORS[colorIdx],
    };
  });
}

export default function MindMapView() {
  const { generateMindMap, generateFormulas } = useGemini();
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [mindMapText, setMindMapText] = useState('');
  const [formulasText, setFormulasText] = useState('');
  const [nodes, setNodes] = useState<MindNode[]>([]);
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [isLoadingFormulas, setIsLoadingFormulas] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateMap = async () => {
    if (!topic.trim()) return;
    setIsLoadingMap(true);
    setMindMapText('');
    setNodes([]);
    try {
      const result = await generateMindMap(topic);
      setMindMapText(result);
      setNodes(parseMindMap(result));
    } catch {
      setMindMapText('Failed to generate mind map. Please try again.');
    } finally {
      setIsLoadingMap(false);
    }
  };

  const handleGenerateFormulas = async () => {
    if (!subject.trim()) return;
    setIsLoadingFormulas(true);
    setFormulasText('');
    try {
      const result = await generateFormulas(subject);
      setFormulasText(result);
    } catch {
      setFormulasText('Failed to generate formula sheet. Please try again.');
    } finally {
      setIsLoadingFormulas(false);
    }
  };

  const copyContent = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderFormulas = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const key = `formula-${i}`;
      if (line.startsWith('**') && line.endsWith('**')) {
        return <h3 key={key} className="text-blue-400 font-semibold text-sm mt-4 mb-1">{line.replace(/\*\*/g, '')}</h3>;
      }
      if (line.startsWith('Formula:')) {
        return (
          <div key={key} className="bg-[#0d1117] border border-blue-500/20 rounded-lg px-3 py-2 my-1 font-mono text-green-300 text-sm">
            {line}
          </div>
        );
      }
      if (line.trim() === '') return <div key={key} className="h-1" />;
      return <p key={key} className="text-gray-400 text-sm leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] p-4">
      <div className="flex items-center gap-2 mb-4">
        <MapPin size={20} className="text-teal-400" />
        <h2 className="text-white font-semibold text-lg">Mind Map & Formulas</h2>
      </div>

      <Tabs defaultValue="mindmap" className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-[#161b22] border border-[#1e2d3d] mb-4 w-full">
          <TabsTrigger value="mindmap" className="flex-1 data-[state=active]:bg-blue-600">
            <MapPin size={14} className="mr-1.5" />
            Mind Map
          </TabsTrigger>
          <TabsTrigger value="formulas" className="flex-1 data-[state=active]:bg-blue-600">
            <Calculator size={14} className="mr-1.5" />
            Formula Sheet
          </TabsTrigger>
        </TabsList>

        {/* Mind Map Tab */}
        <TabsContent value="mindmap" className="flex-1 flex flex-col gap-3 min-h-0 mt-0">
          <div className="flex gap-2">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleGenerateMap(); }}
              placeholder="Enter topic (e.g. Photosynthesis)"
              className="flex-1 bg-[#161b22] border-[#2d3f52] text-white placeholder:text-gray-600"
            />
            <Button
              type="button"
              onClick={() => void handleGenerateMap()}
              disabled={isLoadingMap || !topic.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white whitespace-nowrap"
            >
              {isLoadingMap ? <Loader2 size={16} className="animate-spin" /> : 'Generate'}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoadingMap ? (
              <div className="flex flex-col items-center justify-center h-32 gap-3">
                <Loader2 size={28} className="animate-spin text-teal-400" />
                <p className="text-gray-500 text-sm">Building mind map...</p>
              </div>
            ) : nodes.length > 0 ? (
              <div className="space-y-1">
                {mindMapText && (
                  <div className="flex justify-end mb-2">
                    <button
                      type="button"
                      onClick={() => copyContent(mindMapText)}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
                    >
                      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                      Copy
                    </button>
                  </div>
                )}
                {nodes.map((node, nIdx) => (
                  <div
                    key={`node-${nIdx}-${node.text.substring(0, 8)}`}
                    className="flex items-start gap-2"
                    style={{ paddingLeft: `${node.level * 16}px` }}
                  >
                    <div className={`shrink-0 mt-1.5 w-2 h-2 rounded-full border ${node.color}`} />
                    <span className={`text-sm leading-relaxed ${node.level === 0 ? 'text-white font-bold text-base' : node.color.split(' ')[0]}`}>
                      {node.text}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <MapPin size={32} className="text-gray-600 mb-3" />
                <p className="text-gray-500 text-sm">Enter a topic to generate a mind map</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Formula Sheet Tab */}
        <TabsContent value="formulas" className="flex-1 flex flex-col gap-3 min-h-0 mt-0">
          <div className="flex gap-2">
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleGenerateFormulas(); }}
              placeholder="Subject (e.g. Physics, Calculus)"
              className="flex-1 bg-[#161b22] border-[#2d3f52] text-white placeholder:text-gray-600"
            />
            <Button
              type="button"
              onClick={() => void handleGenerateFormulas()}
              disabled={isLoadingFormulas || !subject.trim()}
              className="bg-pink-600 hover:bg-pink-700 text-white whitespace-nowrap"
            >
              {isLoadingFormulas ? <Loader2 size={16} className="animate-spin" /> : 'Generate'}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoadingFormulas ? (
              <div className="flex flex-col items-center justify-center h-32 gap-3">
                <Loader2 size={28} className="animate-spin text-pink-400" />
                <p className="text-gray-500 text-sm">Generating formula sheet...</p>
              </div>
            ) : formulasText ? (
              <div>
                <div className="flex justify-end mb-2">
                  <button
                    type="button"
                    onClick={() => copyContent(formulasText)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
                  >
                    {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    Copy All
                  </button>
                </div>
                <div className="space-y-0.5">
                  {renderFormulas(formulasText)}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <Calculator size={32} className="text-gray-600 mb-3" />
                <p className="text-gray-500 text-sm">Enter a subject to get the formula sheet</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

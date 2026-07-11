import React, { useState, useRef, useEffect } from 'react';
import WebcamOverlay from '../components/WebcamOverlay';
import { drawHandResults } from '../utils/drawHands';
import { CircleDashed, HelpCircle } from 'lucide-react';

export default function TicTacToe() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true); // true = X, false = O
  const [gameMode, setGameMode] = useState('ai'); // 'ai' or '2p'
  const [winner, setWinner] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [hoverProgress, setHoverProgress] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  
  const hoverStartTimeRef = useRef(null);
  const currentHoveredCellRef = useRef(null);

  // Check for winner
  useEffect(() => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        setWinner(board[a]);
        return;
      }
    }
    if (!board.includes(null)) {
      setWinner('Draw');
    } else if (!isPlayerTurn && !winner && gameMode === 'ai') {
      // AI Turn
      setTimeout(() => {
        const available = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
        if (available.length > 0) {
          const randomIdx = available[Math.floor(Math.random() * available.length)];
          const newBoard = [...board];
          newBoard[randomIdx] = 'O';
          setBoard(newBoard);
          setIsPlayerTurn(true);
        }
      }, 1000);
    }
  }, [board, isPlayerTurn, winner, gameMode]);

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setIsPlayerTurn(true);
    setHoverProgress(0);
    setHoveredCell(null);
    hoverStartTimeRef.current = null;
    currentHoveredCellRef.current = null;
    setShowInstructions(false);
  };

  const handleResults = (results, ctx, webcamCanvas) => {
    drawHandResults(results, ctx, webcamCanvas);

    if (winner || (gameMode === 'ai' && !isPlayerTurn)) {
      setHoverProgress(0);
      setHoveredCell(null);
      currentHoveredCellRef.current = null;
      hoverStartTimeRef.current = null;
      return;
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const indexTip = results.multiHandLandmarks[0][8];
      
      // Canvas is CSS mirrored. MediaPipe gives un-mirrored x.
      // So to map it correctly to the screen regions, we do 1 - x
      const x = 1 - indexTip.x;
      const y = indexTip.y;
      
      if (webcamCanvas) {
        ctx.save();
        ctx.beginPath();
        // Here we draw on unmirrored canvas, so we use original x, not 1-x.
        // Wait, if we use 1-x to calculate regions, and the canvas is mirrored, we should draw at original x.
        ctx.arc((1 - indexTip.x) * webcamCanvas.width, y * webcamCanvas.height, 12, 0, 2 * Math.PI);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }
      
      let col = Math.floor(x * 3);
      let row = Math.floor(y * 3);
      
      col = Math.max(0, Math.min(2, col));
      row = Math.max(0, Math.min(2, row));
      
      const cellIndex = row * 3 + col;

      if (board[cellIndex] === null) {
        if (currentHoveredCellRef.current !== cellIndex) {
          currentHoveredCellRef.current = cellIndex;
          hoverStartTimeRef.current = performance.now();
          setHoveredCell(cellIndex);
        } else {
          const elapsed = performance.now() - hoverStartTimeRef.current;
          const progress = Math.min((elapsed / 600) * 100, 100); // 600ms hold time
          setHoverProgress(progress);

          if (progress === 100) {
            const newBoard = [...board];
            newBoard[cellIndex] = isPlayerTurn ? 'X' : 'O';
            setBoard(newBoard);
            setIsPlayerTurn(!isPlayerTurn);
            setHoverProgress(0);
            setHoveredCell(null);
            currentHoveredCellRef.current = null;
            hoverStartTimeRef.current = null;
          }
        }
      } else {
        setHoverProgress(0);
        setHoveredCell(null);
        currentHoveredCellRef.current = null;
        hoverStartTimeRef.current = null;
      }
    } else {
      setHoverProgress(0);
      setHoveredCell(null);
      currentHoveredCellRef.current = null;
      hoverStartTimeRef.current = null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1 text-white flex items-center gap-2">
            <CircleDashed className="text-primary"/> Gesture Tic-Tac-Toe
          </h2>
          <p className="text-slate-400 text-sm">Point and hover over a cell to place your mark.</p>
        </div>
        
        <div className="flex gap-4 items-center">
          <button onClick={() => setShowInstructions(!showInstructions)} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
            <HelpCircle size={24} />
          </button>
          <select 
            value={gameMode} 
            onChange={(e) => { setGameMode(e.target.value); resetGame(); }}
            className="bg-slate-800 text-white px-4 py-2 rounded-xl border border-slate-700 outline-none focus:border-primary font-bold shadow-lg"
          >
            <option value="ai">Vs AI</option>
            <option value="2p">2 Players</option>
          </select>
          <button onClick={resetGame} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-bold border border-slate-700 transition-colors shadow-lg">
            Restart
          </button>
        </div>
      </div>

      <div className="flex-1 relative rounded-2xl overflow-hidden border border-slate-700/50 bg-black flex flex-col md:flex-row shadow-2xl">
        <div className="w-full md:w-2/3 h-full relative">
          <WebcamOverlay onResults={handleResults}>
            
            {showInstructions && (
              <div className="absolute top-4 left-4 z-50 glass-panel p-6 max-w-sm border border-primary/30 shadow-2xl bg-slate-900/90 backdrop-blur-xl">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2 border-b border-slate-700 pb-2">
                  <HelpCircle className="text-primary"/> How to Play
                </h3>
                <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                  Use your <strong>Index Finger</strong> to point at the screen. Hover over a grid cell for 0.6 seconds to place your mark.
                </p>
                <img src="/instructions/instruction_point_1782396768750.png" alt="Point Gesture" className="w-full rounded-xl border border-slate-700 shadow-md mb-2" />
                <button onClick={() => setShowInstructions(false)} className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold transition-colors">Play</button>
              </div>
            )}

            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
              {board.map((cell, idx) => (
                <div key={idx} className="border border-slate-500/30 flex items-center justify-center relative">
                  {hoveredCell === idx && hoverProgress > 0 && !winner && (isPlayerTurn || gameMode === '2p') && (
                    <div 
                      className="absolute inset-0 bg-primary/20 transition-all duration-75 border-4 border-primary/50"
                      style={{ transform: `scale(${hoverProgress / 100})`, opacity: hoverProgress / 100 }}
                    />
                  )}
                  {cell && (
                    <span className={`text-8xl font-black ${cell === 'X' ? 'text-primary' : 'text-secondary'} drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-in zoom-in duration-300`}>
                      {cell}
                    </span>
                  )}
                </div>
              ))}
            </div>
            
            {winner && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center pointer-events-auto backdrop-blur-md animate-in fade-in duration-500">
                 <h3 className={`text-7xl font-black mb-8 drop-shadow-2xl uppercase tracking-widest ${winner === 'X' ? 'text-primary' : winner === 'O' ? 'text-secondary' : 'text-yellow-400'}`}>
                  {winner === 'Draw' ? "It's a Draw!" : `${winner} Wins!`}
                </h3>
                <button onClick={resetGame} className="px-10 py-5 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-500 hover:to-blue-400 rounded-2xl font-black text-white transition-all transform hover:scale-105 text-2xl shadow-[0_0_30px_rgba(59,130,246,0.4)]">
                  Play Again
                </button>
              </div>
            )}

          </WebcamOverlay>
        </div>

        <div className="w-full md:w-1/3 glass-panel rounded-none border-l border-slate-700/50 p-6 flex flex-col justify-center items-center text-center bg-slate-900">
          <CircleDashed size={64} className="text-slate-600 mb-8" />
          
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl w-full relative overflow-hidden">
             {gameMode === 'ai' && !isPlayerTurn && !winner && (
               <div className="absolute inset-0 bg-secondary/10 animate-pulse"></div>
             )}
             <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 relative z-10">Current Turn</h3>
             <div className="text-4xl font-black relative z-10">
               {winner ? (
                 <span className="text-slate-500">Game Over</span>
               ) : (
                 <span className={isPlayerTurn ? 'text-primary' : 'text-secondary'}>
                   {gameMode === 'ai' 
                     ? (isPlayerTurn ? 'Your Turn (X)' : 'AI Turn (O)')
                     : (isPlayerTurn ? 'Player 1 (X)' : 'Player 2 (O)')}
                 </span>
               )}
             </div>
          </div>

          {(!winner && (isPlayerTurn || gameMode === '2p') && hoveredCell !== null) && (
            <div className="w-full mt-8">
               <div className="flex justify-between text-slate-500 text-xs font-bold uppercase mb-2">
                 <span>Locking Target</span>
                 <span>{Math.round(hoverProgress)}%</span>
               </div>
               <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
                 <div 
                   className="h-full bg-gradient-to-r from-[#00f2fe] to-[#4facfe] transition-all duration-75"
                   style={{ width: `${hoverProgress}%` }}
                 />
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

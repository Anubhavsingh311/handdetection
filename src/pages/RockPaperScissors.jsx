import React, { useState, useRef, useEffect } from 'react';
import WebcamOverlay from '../components/WebcamOverlay';
import { drawHandResults } from '../utils/drawHands';
import { countFingers } from '../utils/gestureMath';
import { Scissors, ShieldQuestion, HelpCircle, Trophy } from 'lucide-react';
import SplitText from '../components/reactbits/SplitText';
import Ballpit from '../components/reactbits/Ballpit';

const CHOICES = ['Rock', 'Paper', 'Scissors'];

// Markov Chain for AI Prediction
const markovChainRef = useRef({
  Rock: { Rock: 1, Paper: 1, Scissors: 1 },
  Paper: { Rock: 1, Paper: 1, Scissors: 1 },
  Scissors: { Rock: 1, Paper: 1, Scissors: 1 },
});

export default function RockPaperScissors() {
  const [playerChoice, setPlayerChoice] = useState(null);
  const [aiChoice, setAiChoice] = useState(null);
  const [result, setResult] = useState('');
  const [scores, setScores] = useState({ player: 0, ai: 0 });
  
  const [difficulty, setDifficulty] = useState('hard');
  const [mode, setMode] = useState('1'); // '1' = single round, '3' = best of 3, '5' = best of 5
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [matchWinner, setMatchWinner] = useState(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [detecting, setDetecting] = useState(null);
  const [roundFinished, setRoundFinished] = useState(false);

  const lastPlayerChoiceRef = useRef(null);
  const lockTimerRef = useRef(null);
  const currentFingersRef = useRef(null);

  const getAiChoice = (lastChoice) => {
    if (difficulty === 'easy' || !lastChoice) {
      return CHOICES[Math.floor(Math.random() * CHOICES.length)];
    }

    // Hard Mode: Predict next move based on markov chain
    const transitions = markovChain[lastChoice];
    const total = transitions.Rock + transitions.Paper + transitions.Scissors;
    const r = Math.random() * total;

    let predictedUserNext;
    if (r < transitions.Rock) predictedUserNext = 'Rock';
    else if (r < transitions.Rock + transitions.Paper) predictedUserNext = 'Paper';
    else predictedUserNext = 'Scissors';

    // Counter the predicted move
    if (predictedUserNext === 'Rock') return 'Paper';
    if (predictedUserNext === 'Paper') return 'Scissors';
    return 'Rock';
  };

  const determineWinner = (player, ai) => {
    if (player === ai) return 'Tie';
    if (
      (player === 'Rock' && ai === 'Scissors') ||
      (player === 'Paper' && ai === 'Rock') ||
      (player === 'Scissors' && ai === 'Paper')
    ) {
      return 'Player';
    }
    return 'AI';
  };

  const handleRoundEnd = (winner) => {
    let pScore = scores.player;
    let aScore = scores.ai;
    
    if (winner === 'Player') pScore++;
    else if (winner === 'AI') aScore++;

    setScores({ player: pScore, ai: aScore });
    setRoundsPlayed(r => r + 1);
  };

  const handleNextGame = () => {
    const neededToWin = mode === '1' ? 1 : mode === '3' ? 2 : 3;
    if (scores.player >= neededToWin) {
      setMatchWinner('Player');
      setRoundFinished(false);
    } else if (scores.ai >= neededToWin) {
      setMatchWinner('AI');
      setRoundFinished(false);
    } else {
      setRoundFinished(false);
      setPlayerChoice(null);
      setAiChoice(null);
      setResult('');
    }
  };

  const resetMatch = () => {
    setPlayerChoice(null);
    setAiChoice(null);
    setResult('');
    setScores({ player: 0, ai: 0 });
    setRoundsPlayed(0);
    setMatchWinner(null);
    setRoundFinished(false);
  };

  const handleResults = (results, ctx, canvas) => {
    drawHandResults(results, ctx, canvas);

    if (matchWinner || roundFinished) return;

    let fingers = -1;
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      fingers = countFingers(results.multiHandLandmarks[0], results.multiHandedness[0].label);
    }

    let detectedChoice = null;
    if (fingers === 0) detectedChoice = 'Rock';
    else if (fingers === 2) detectedChoice = 'Scissors';
    else if (fingers === 5) detectedChoice = 'Paper';

    if (detectedChoice) {
      if (currentFingersRef.current !== detectedChoice) {
        if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
        
        currentFingersRef.current = detectedChoice;
        setDetecting(detectedChoice);
        lockTimerRef.current = setTimeout(() => {
          // Lock in choice
          const aiMove = getAiChoice(lastPlayerChoiceRef.current);
          const roundWinner = determineWinner(detectedChoice, aiMove);

          // Update Markov Chain
          if (lastPlayerChoiceRef.current) {
            markovChain[lastPlayerChoiceRef.current][detectedChoice]++;
          }
          lastPlayerChoiceRef.current = detectedChoice;

          setPlayerChoice(detectedChoice);
          setAiChoice(aiMove);
          setResult(roundWinner === 'Tie' ? "It's a Tie!" : `${roundWinner} Wins!`);
          
          handleRoundEnd(roundWinner);
          
          currentFingersRef.current = null;
          setDetecting(null);
          setRoundFinished(true);
        }, 1500); // Need to hold gesture for 1.5s
      }
    } else {
      if (lockTimerRef.current) {
        clearTimeout(lockTimerRef.current);
        lockTimerRef.current = null;
        currentFingersRef.current = null;
        setDetecting(null);
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1 text-white flex items-center gap-2">
            <Scissors className="text-primary"/> Rock Paper Scissors
          </h2>
          <p className="text-slate-400 text-sm">Hold your gesture for 1.5 seconds to lock it in.</p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          <button onClick={() => setShowInstructions(!showInstructions)} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
            <HelpCircle size={24} />
          </button>
          
          <select 
            value={difficulty} 
            onChange={(e) => setDifficulty(e.target.value)}
            disabled={roundsPlayed > 0 && !matchWinner}
            className="bg-slate-800 text-white px-4 py-2 rounded-xl border border-slate-700 outline-none focus:border-primary font-bold shadow-lg"
          >
            <option value="easy">AI: Easy (Random)</option>
            <option value="hard">AI: Hard (Predictive)</option>
          </select>
          
          <select 
            value={mode} 
            onChange={(e) => { setMode(e.target.value); resetMatch(); }}
            className="bg-slate-800 text-white px-4 py-2 rounded-xl border border-slate-700 outline-none focus:border-primary font-bold shadow-lg"
          >
            <option value="1">Single Match</option>
            <option value="3">Best of 3</option>
            <option value="5">Best of 5</option>
          </select>

          <button onClick={resetMatch} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-bold border border-slate-700 transition-colors shadow-lg">
            Restart Match
          </button>
        </div>
      </div>

      <div className="flex-1 relative rounded-2xl overflow-hidden border border-slate-700/50 bg-black flex flex-col md:flex-row shadow-2xl">
        <div className="w-full md:w-2/3 h-full relative">
          <WebcamOverlay onResults={handleResults}>
            
            {showInstructions && (
              <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center backdrop-blur-md p-8 overflow-y-auto">
                 <h3 className="text-3xl font-black text-white mb-8 flex items-center gap-3">
                   <ShieldQuestion className="text-primary"/> How to Play
                 </h3>
                 
                 <div className="flex gap-8 mb-8">
                   <div className="flex flex-col items-center text-center max-w-[200px]">
                     <img src="/instructions/instruction_rock_1782396781421.png" alt="Rock" className="w-full rounded-2xl border border-slate-700 shadow-xl mb-4" />
                     <span className="text-xl font-bold text-white mb-2">Rock</span>
                     <p className="text-sm text-slate-400">Make a closed fist (0 fingers).</p>
                   </div>
                   <div className="flex flex-col items-center text-center max-w-[200px]">
                     <img src="/instructions/instruction_paper_1782396795310.png" alt="Paper" className="w-full rounded-2xl border border-slate-700 shadow-xl mb-4" />
                     <span className="text-xl font-bold text-white mb-2">Paper</span>
                     <p className="text-sm text-slate-400">Make a flat open palm (5 fingers).</p>
                   </div>
                   <div className="flex flex-col items-center text-center max-w-[200px]">
                     <img src="/instructions/instruction_scissors_1782396809418.png" alt="Scissors" className="w-full rounded-2xl border border-slate-700 shadow-xl mb-4" />
                     <span className="text-xl font-bold text-white mb-2">Scissors</span>
                     <p className="text-sm text-slate-400">Make a peace sign (2 fingers).</p>
                   </div>
                 </div>

                 <button onClick={() => setShowInstructions(false)} className="px-10 py-4 bg-primary hover:bg-blue-600 rounded-xl text-xl font-black text-white transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                   I'm Ready!
                 </button>
              </div>
            )}

            {matchWinner && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center pointer-events-auto backdrop-blur-md animate-in zoom-in duration-300 z-50 overflow-hidden">
                {matchWinner === 'Player' && <Ballpit count={100} gravity={0.3} bounce={0.9} colors={['#00f2fe', '#4facfe', '#fbbf24', '#f87171']} />}
                <Trophy size={80} className={`mb-6 drop-shadow-2xl relative z-10 ${matchWinner === 'Player' ? 'text-yellow-400' : 'text-red-500'}`} />
                <h3 className="text-6xl font-black mb-4 text-white uppercase tracking-wider relative z-10">
                  <SplitText text={matchWinner === 'Player' ? 'TOURNAMENT WON!' : 'DEFEATED!'} delay={50} />
                </h3>
                <p className="text-2xl text-slate-300 mb-8 font-medium relative z-10">Final Score: <span className="text-primary">{scores.player}</span> - <span className="text-red-400">{scores.ai}</span></p>
                <button onClick={resetMatch} className="px-10 py-4 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-500 hover:to-blue-400 rounded-xl font-bold text-white transition-all transform hover:scale-105 text-xl shadow-lg relative z-10">
                  Play Again
                </button>
              </div>
            )}
            
            {!matchWinner && roundFinished && playerChoice && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center pointer-events-auto backdrop-blur-md animate-in fade-in duration-300 z-40">
                <div className="bg-black/60 backdrop-blur-md px-8 py-6 rounded-full border border-primary/30 flex items-center gap-6 text-white shadow-2xl mb-8">
                  <span className="text-4xl font-bold text-primary">You: {playerChoice}</span>
                  <span className="text-slate-500 font-black px-4 text-2xl">VS</span>
                  <span className="text-4xl font-bold text-red-400">AI: {aiChoice}</span>
                </div>
                <h3 className={`text-6xl font-black mb-10 uppercase tracking-wider ${result.includes('Tie') ? 'text-yellow-400' : result.includes('Player') ? 'text-primary' : 'text-red-500'}`}>
                  {result}
                </h3>
                <button onClick={handleNextGame} className="px-12 py-4 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-500 hover:to-blue-400 rounded-xl font-bold text-white transition-all transform hover:scale-105 text-2xl shadow-lg">
                  Next Game
                </button>
              </div>
            )}
            {!matchWinner && !roundFinished && detecting && (
              <div className="absolute top-8 left-0 right-0 flex justify-center animate-in fade-in duration-300">
                <div className="bg-black/80 backdrop-blur-md px-8 py-4 rounded-full border border-yellow-500/50 flex items-center gap-4 text-white shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                  <div className="w-6 h-6 rounded-full border-4 border-yellow-500 border-t-transparent animate-spin"></div>
                  <span className="text-xl font-bold text-yellow-400 tracking-wider uppercase">Detecting: {detecting}</span>
                </div>
              </div>
            )}
          </WebcamOverlay>
        </div>

        <div className="w-full md:w-1/3 glass-panel rounded-none md:border-l border-t md:border-t-0 border-slate-700/50 p-6 flex flex-col bg-slate-900">
          <div className="flex-1 flex flex-col justify-center items-center">
             
             <div className="w-full mb-8">
               <div className="flex justify-between items-end mb-4">
                 <div className="flex flex-col">
                   <span className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Player</span>
                   <span className="text-6xl font-black text-primary drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">{scores.player}</span>
                 </div>
                 <span className="text-2xl font-black text-slate-700 pb-2">-</span>
                 <div className="flex flex-col items-end">
                   <span className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">AI</span>
                   <span className="text-6xl font-black text-red-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.3)]">{scores.ai}</span>
                 </div>
               </div>
               
               {mode !== '1' && (
                 <div className="w-full flex justify-center gap-2">
                   {Array.from({length: mode === '3' ? 2 : 3}).map((_, i) => (
                     <div key={`p-${i}`} className={`h-2 w-8 rounded-full ${i < scores.player ? 'bg-primary shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-slate-800'}`}></div>
                   ))}
                   <div className="w-4"></div>
                   {Array.from({length: mode === '3' ? 2 : 3}).map((_, i) => (
                     <div key={`a-${i}`} className={`h-2 w-8 rounded-full ${i < scores.ai ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-slate-800'}`}></div>
                   ))}
                 </div>
               )}
             </div>

             <div className="w-full bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center min-h-[120px] flex items-center justify-center">
               <span className={`text-2xl font-black uppercase tracking-widest ${result.includes('Tie') ? 'text-yellow-400' : result.includes('Player') ? 'text-primary' : result.includes('AI') ? 'text-red-400' : 'text-slate-600'}`}>
                 {result || 'Waiting for move...'}
               </span>
             </div>

          </div>
        </div>
      </div>
    </div>
  );
}

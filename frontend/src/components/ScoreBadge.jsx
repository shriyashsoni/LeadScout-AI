const ScoreBadge = ({ label, score }) => {
  const styles = {
    hot: 'bg-black text-white border-black',
    warm: 'bg-black/10 text-black border-black/10',
    cold: 'bg-white text-black/30 border-black/10',
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-sm border text-[10px] font-black tracking-widest ${styles[label.toLowerCase()] || styles.cold}`}>
      {label.toUpperCase()} &bull; {score}
    </div>
  );
};

export default ScoreBadge;

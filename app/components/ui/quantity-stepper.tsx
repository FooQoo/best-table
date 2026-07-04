type QuantityStepperProps = {
  value: number;
  labelSuffix: string;
  onIncrement: () => void;
  onDecrement: () => void;
};

export function QuantityStepper({ value, labelSuffix, onIncrement, onDecrement }: QuantityStepperProps) {
  return (
    <div className="flex items-center gap-2.5 border-[1.5px] border-[#d8d2c0] rounded-md px-2.5 py-2">
      <button
        type="button"
        onClick={onDecrement}
        className="w-6 h-6 flex items-center justify-center border-[1.5px] border-[#d8d2c0] rounded bg-white cursor-pointer text-[#20201c] hover:bg-[#fdf9ef] hover:border-[#c8a24a] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[rgba(200,162,74,.45)]"
      >
        −
      </button>
      <div className="text-[15px] whitespace-nowrap">
        {value}
        {labelSuffix}
      </div>
      <button
        type="button"
        onClick={onIncrement}
        className="w-6 h-6 flex items-center justify-center border-[1.5px] border-[#d8d2c0] rounded bg-white cursor-pointer text-[#20201c] hover:bg-[#fdf9ef] hover:border-[#c8a24a] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[rgba(200,162,74,.45)]"
      >
        ＋
      </button>
    </div>
  );
}

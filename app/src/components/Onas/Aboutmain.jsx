import React, { useState } from "react";
import img from "../../assets/obraz6.png";
import VisibilitySensor from "react-visibility-sensor";
import Reveal from "../Animation/Reveal";

const Aboutmain = () => {
  const [visible, setVisible] = useState(false);

  const onChange = (isVisible) => {
    if (isVisible) {
      setVisible(true);
    }
  };
  return (
    <Reveal>
      <VisibilitySensor onChange={onChange}>
        <div className="flex flex-col items-center gap-5 pt-[100px] px-10">
          <h1 className="uppercase font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl">
            O nas
          </h1>
          <div className="flex md:flex-row flex-col gap-5">
            <img src={img} alt="" className="md:w-[50%] rounded-3xl" />
            <div className="flex flex-col gap-4">
              <p className="font-semibold text-lg sm:text-xl md:text-2xl lg:text-3xl">
                Nasz program sam wyśle przypomninie od nadchodzącym sweriwse,
                dieki zemu nie muisz już więcej sam sprawadzć ie jeszcze
                otogodzin może przepracwać twój silnik do nstpepnego serwisu.
              </p>
              <button className="w-[100px] bg-[#031124] uppercase px-4 py-2 text-white rounded-full hover:scale-105 transition-transform duration-200 ease-in-out">
                <a href="/oferta"> oferta</a>
              </button>
            </div>
          </div>
        </div>
      </VisibilitySensor>
    </Reveal>
  );
};

export default Aboutmain;

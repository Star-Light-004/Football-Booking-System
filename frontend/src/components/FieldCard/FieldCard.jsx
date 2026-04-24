import React from "react";
import { Link } from "react-router-dom";
import "./FieldCard.css";

const FieldCard = ({ id, image, type, name, location, price }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-shadow group">
    <div className="relative h-56 overflow-hidden">
      <img
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        src={image}
        alt={name}
      />
      <div className="absolute top-4 left-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
        {type}
      </div>
    </div>
    <div className="p-6">
      <h5 className="text-xl font-bold mb-2">{name}</h5>
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-4">
        <span className="material-symbols-outlined text-sm">location_on</span>
        {location}
      </div>
      <div className="flex justify-between items-center py-4 border-t border-slate-100 dark:border-slate-700">
        <div>
          <span className="text-primary text-lg font-bold">{price}</span>
          <span className="text-slate-400 text-xs">/ trận</span>
        </div>
        <Link
          to={`/fields/${id}`}
          className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-primary hover:dark:bg-primary hover:text-white transition-colors"
        >
          Xem chi tiết
        </Link>
      </div>
    </div>
  </div>
);

export default FieldCard;

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Reporte(Base):
    __tablename__ = "reportes"

    id = Column(String, primary_key=True)
    version = Column(String, default="1.0")
    estado_documento = Column(String, default="BORRADOR")
    fecha_emision = Column(DateTime, default=datetime.utcnow)
    generado_por = Column(String, default="LariScan v1.0.0")
    norma_gestion = Column(String, default="ISO 9001:2015")

    id_rollo = Column(String)
    numero_lote = Column(String)
    proveedor = Column(String)
    tipo_tela = Column(String)
    ancho_pulgadas = Column(Float)
    largo_yardas = Column(Float)
    fecha_recepcion = Column(String)
    fecha_inspeccion = Column(String)

    inspector_id = Column(String)
    inspector_nombre = Column(String)
    inspector_turno = Column(String)
    norma_aplicada = Column(String, default="ASTM D5430")
    umbral_configurado = Column(Float)
    configuracion_id = Column(String)
    camara_id = Column(String, default="CAM-001")
    calibracion_escala = Column(String)
    inicio_inspeccion = Column(DateTime)
    fin_inspeccion = Column(DateTime)
    duracion_minutos = Column(Float)

    total_defectos_detectados = Column(Integer, default=0)
    puntos_totales_astm = Column(Float, default=0.0)
    score_100yd2 = Column(Float, default=0.0)
    umbral_aplicado = Column(Float)
    rechazo_automatico = Column(Boolean, default=False)
    uniformidad_color = Column(String, default="SIN_EVALUACION")
    veredicto_final = Column(String)
    confianza_modelo = Column(String)

    firma_inspector_id = Column(String, nullable=True)
    firma_timestamp = Column(DateTime, nullable=True)
    firma_accion = Column(String, nullable=True)
    hash_documento = Column(String, nullable=True)
    inmutable_desde = Column(DateTime, nullable=True)

    retencion_hasta = Column(DateTime)

    defectos = relationship("DefectoIndividual", back_populates="reporte", cascade="all, delete-orphan")
    no_conformidad = relationship("NoConformidad", back_populates="reporte", uselist=False, cascade="all, delete-orphan")


class DefectoIndividual(Base):
    __tablename__ = "defectos"

    id = Column(String, primary_key=True)
    reporte_id = Column(String, ForeignKey("reportes.id"))
    tipo = Column(String)
    tamano_px_ancho = Column(Integer, nullable=True)
    tamano_px_alto = Column(Integer, nullable=True)
    tamano_in = Column(Float)
    puntos_asignados = Column(Integer)
    posicion_rollo_metros = Column(Float)
    confianza_deteccion = Column(Float)
    imagen_evidencia = Column(String, nullable=True)
    validado_por_inspector = Column(Boolean, default=False)
    accion_tomada = Column(String, default="registrado")

    reporte = relationship("Reporte", back_populates="defectos")


class NoConformidad(Base):
    __tablename__ = "no_conformidades"

    id = Column(String, primary_key=True)
    reporte_id = Column(String, ForeignKey("reportes.id"))
    motivo = Column(String)
    descripcion = Column(String)
    disposicion = Column(String, nullable=True)
    accion_correctiva = Column(Text, nullable=True)
    responsable_ac = Column(String, nullable=True)
    fecha_limite_ac = Column(DateTime, nullable=True)
    estado_nc = Column(String, default="ABIERTA")
    retencion_hasta = Column(DateTime)

    reporte = relationship("Reporte", back_populates="no_conformidad")


class LogAcceso(Base):
    __tablename__ = "logs_acceso"

    id = Column(Integer, primary_key=True, autoincrement=True)
    usuario_id = Column(String)
    usuario_nombre = Column(String)
    accion = Column(String)
    recurso = Column(String)
    parametros = Column(Text, nullable=True)
    ip = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    retencion_hasta = Column(DateTime)

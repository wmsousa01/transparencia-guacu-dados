"""Municípios de comparação.

- REGIAO: cidades da Baixa Mogiana e entorno imediato de Mogi Guaçu.
- PORTE: municípios paulistas com população até 20% acima ou abaixo da de Mogi Guaçu
  (estimativa usada pelo Siconfi em 2026), excluída a Região Metropolitana de São Paulo,
  cuja dinâmica fiscal (cidade-dormitório, conurbação) não é comparável.
  Revisar quando sair nova estimativa de população.
"""

ALVO = (3530706, "Mogi Guaçu")

REGIAO = [
    (3530805, "Mogi Mirim"),
    (3522604, "Itapira"),
    (3557303, "Estiva Gerbi"),
    (3500303, "Aguaí"),
    (3512209, "Conchal"),
    (3515152, "Engenheiro Coelho"),
    (3548005, "Santo Antônio de Posse"),
    (3503307, "Araras"),
    (3526704, "Leme"),
]

PORTE = [
    (3554003, "Tatuí"),
    (3551702, "Sertãozinho"),
    (3556206, "Valinhos"),
    (3557006, "Votorantim"),
    (3503307, "Araras"),
    (3525300, "Jaú"),
    (3545209, "Salto"),
    (3510500, "Caraguatatuba"),
    (3507506, "Botucatu"),
    (3522307, "Itapetininga"),
    (3504107, "Atibaia"),
    (3538006, "Pindamonhangaba"),
    (3523909, "Itu"),
    (3507605, "Bragança Paulista"),
    (3545803, "Santa Bárbara d'Oeste"),
]


def todos():
    vistos = {}
    for cod, nome in [ALVO, *REGIAO, *PORTE]:
        vistos.setdefault(cod, nome)
    return vistos

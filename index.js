const express = require('express');
const server = express();
const mysql = require('mysql');
const cors = require('cors');

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "regcam",
    charset: "utf8mb4",
});

server.use(express.json());
server.use(cors());

server.post("/registrarEvento", (req, res) => {
    const { fecha } = req.body;
    const { tipo } = req.body;
    const { descripcion } = req.body;
    const { id_camara } = req.body;

    let sql = "INSERT INTO registros (fecha, tipo, descripcion, id_camara) VALUES (?,?,?,?)"
    db.query(sql, [fecha, tipo, descripcion, id_camara], (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(result);
        }
    })
});

server.get("/registrosCamara/:id", (req, res) => {
    const { id } = req.params;
    let sql = "select registros.id, registros.tipo, registros.fecha, registros.descripcion from registros join camara on registros.id_camara = camara.id where camara.id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(result);
        }

    })
});


server.delete("/eliminarRegistro/:id", (req, res) => {
    const { id } = req.params;
    let sql = "delete from registros where id = ?"
    db.query(sql, [id], (err, result) => { err ? console.log(err) : res.send(result) })
})


server.get("/locacionCamara/:id", (req, res) => {
    const { id } = req.params;
    let sql = "SELECT locacion from camara where id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(result);
        }
    })
});

server.get("/registros", (req, res) => {
    let sql = "SELECT * from registros order by fecha desc";
    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(result);
        }

    })
});

server.get("/locaciones", (req, res) => {
    let sql = "SELECT locacion from camara group by locacion";
    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(result);
        }

    })
});

server.post("/registrarEstados", (req, res) => {
    const datos = req.body;
    const insertPromises = datos.map((item) => {
      const { id, evento, fecha } = item;
      const sql = "INSERT INTO Estados (id_camara, evento, fecha) VALUES (?,?,?)";
      const values = [id, evento, fecha];
      return new Promise((resolve, reject) => {
        db.query(sql, values, (err, result) => {
          if (err) {
            console.error(err);
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    });
  
    Promise.all(insertPromises)
      .then((results) => {
        res.json(results);
      })
      .catch((error) => {
        res.status(500).json({ error: 'Error interno del servidor' });
      });
  });


server.get("/camaras", (req, res) => {
    let sql = "SELECT * from camara";
    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(result);
        }

    })
});

server.get("/tiposEventos", (req, res) => {
    let sql = "SELECT * from eventos";
    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(result);
        }

    })
});

server.post("/registrarEstado", (req, res) => {
    const { nombre } = req.body;
    const { superfamilia } = req.body;
    let sql = "insert into Estados (nombre, superfamilia) values (?,?)";
    db.query(sql, [nombre, superfamilia], (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(result);
        }
    })
});

server.post("/guardarRegistro", (req, res) => {
    const { id } = req.body;
    const { tipo } = req.body;
    const { fecha } = req.body;
    const { descripcion } = req.body
    let sql = "insert into registros (tipo, fecha, descripcion, id_camara) values (?,?,?,?)";
    db.query(sql, [tipo, fecha, descripcion, id], (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(result);
        }
    })
});


server.put("/actualizarRegistro/:id", (req, res) => {
    const registroId = req.params.id;
    const { tipo, fecha, descripcion } = req.body;
    
    let sql = "UPDATE registros SET tipo = ?, fecha = ?, descripcion = ? WHERE id = ?";
    
    db.query(sql, [tipo, fecha, descripcion, registroId], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Error al actualizar el registro' });
        } else {
            res.json({ message: 'Registro actualizado con éxito' });
        }
    });
});



server.listen(3001, () =>
    console.log("Corriendo en 3001")
);


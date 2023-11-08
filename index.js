const express = require('express');
const server = express();
const mysql = require('mysql');
const cors = require('cors');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const moment = require('moment-timezone');
moment.tz.setDefault('America/Santiago');
server.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24
    }
}))
const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "regcam",
    charset: "utf8mb4",
});

server.use(express.json());
server.use(cors());

//login

server.get('/', (req, res) => {
    if (req.session.username) {
        return res.json({ valid: true, role: req.session.role });
    } else {
        return res.json({ valid: false });
    }
})
server.post('/sigup', (req, res) => {
    const sql = "insert into users (username, password) values (?)";
    const values = [
        req.body.username,
        req.body.password
    ]

    db.query(sql, [values], (err, result) => {
        if (err) return res.json({ Message: "Error en el servidor" });
        return res.json(result);
    })
})

server.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Realizar una consulta a la base de datos para verificar las credenciales del usuario
    const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';

    db.query(sql, [username, password], (err, results) => {
        if (err) {
            console.error('Error al consultar la base de datos:', err);
            res.status(500).json({ error: 'Error en el servidor' });
        } else if (results.length > 0) {
            const user = results[0];

            // Generar un token JWT con el rol del usuario
            const token = jwt.sign({ username: user.username, role: user.role }, 'tu_secreto_secreto', {
                expiresIn: '1h', // Tiempo de expiración del token
            });

            res.json({ token, user });
        } else {
            // Credenciales incorrectas
            res.status(401).json({ error: 'Credenciales incorrectas' });
        }
    });
});

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
    let sql = "select registros.id, registros.tipo, registros.fecha, eventos.color, registros.descripcion from registros join camara on registros.id_camara = camara.id join eventos on eventos.tipo = registros.tipo where registros.id_camara = ?";
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
    let sql = "SELECT registros.id, registros.fecha, registros.tipo, registros.descripcion, registros.id_camara, eventos.color from registros join eventos on registros.tipo = eventos.tipo order by fecha desc";
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



server.get("/actualizarRegistro/:id", (req, res) => {
    const { id } = req.params;
    let sql = "select * from registros where id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            res.status(500).json({ error: "Hubo un error en la consulta a la base de datos" });
        } else {
            console.log(result[0].tipo, result[0].fecha, result[0].descripcion)
            res.send(result);
        }
        
    })
})
server.post("/actualizarRegistro", (req, res) => {
    const { id_registro } = req.body;
    const { tipo } = req.body;
    const { descripcion } = req.body;
    const { fecha } = req.body;
    const { id_camara } = req.body;
    const fecha_actual = moment().format('YYYY-MM-DD HH:mm:ss');

    //obtener el estado actual del registro y mandarlo al historial
    let estado_actual = "select * from registros where id = ?";
    db.query(estado_actual, [id_registro], (err, result) => {
        if (err) {
            res.status(500).json({ error: "Hubo un error en la consulta a la base de datos" });
        } else {
            let actualizar_historial = "insert into historial (id_registro, tipo, fecha, fecha_modificacion, descripcion) values (?,?,?,?,?)";
            db.query(actualizar_historial, [id_registro, result[0].tipo, result[0].fecha, fecha_actual, result[0].descripcion], (err, result) => {
                if (err) {
                    res.status(500).json({ error: "Hubo un error en la consulta a la base de datos" });
                } else {
                    let actualizar_estado_registro = "UPDATE registros SET fecha = ?, tipo = ?, descripcion = ?, id_camara = ? WHERE id = ?";
                    db.query(actualizar_estado_registro, [fecha, tipo, descripcion, id_camara, id_registro], (err, result) => {
                        if (err) {
                            res.status(500).json({ error: "Hubo un error en la consulta a la base de datos" });
                        } else {
                            res.send(result);
                        }
                    })
                }
            })
        }
    })
})

server.get("/historial/:id", (req, res) => {
    const id = req.params.id;

    let sql = "SELECT * from historial where id_registro = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            res.status(500).json({ error: "Hubo un error en la consulta a la base de datos" });
        } else {
            res.send(result);
        }
    })
})
server.post("/guardarRegistro", (req, res) => {
    const { id_camara } = req.body;
    const { tipo } = req.body;
    const { fecha } = req.body;
    const { descripcion } = req.body
    let sql = "insert into registros (tipo, fecha, descripcion, id_camara) values (?,?,?,?)";
    db.query(sql, [tipo, fecha, descripcion, id_camara], (err, result) => {
        if (err) {
            res.status(500).json({ error: "Hubo un error en la consulta a la base de datos" });
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


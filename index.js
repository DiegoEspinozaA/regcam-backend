const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const moment = require('moment-timezone');
moment.tz.setDefault('America/Santiago');

const app = express();
app.use(cors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());


app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24
    },
    
}))

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "regcam",
    charset: "utf8mb4",
});

//login

app.get('/', (req, res) => {
    if (req.session.rol) {
        return res.json({ valid: true, rol: req.session.rol });
    } else {
        return res.json({ valid: false });
    }
})


app.post('/login', (req, res) => {
    const { username, password } = req.body;
    let sql = "select * from users where username = ? and password = ?";
    db.query(sql, [username, password], (err, result) => {
        if(result.length > 0) {
          req.session.rol = result[0].rol;
          
          return res.json({Login: true})

        } else {
            return res.json({Login: false})
        }
    })
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    return res.json("Success");
})

app.post("/registrarEvento", (req, res) => {
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

app.get("/registrosCamara/:id", (req, res) => {
    const { id } = req.params;
    let sql = "select registros.id, registros.id_camara, registros.tipo, registros.fecha, eventos.color, registros.descripcion from registros join camara on registros.id_camara = camara.id join eventos on eventos.tipo = registros.tipo where registros.id_camara = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(result);
        }

    })
});


app.delete("/eliminarRegistro/:id", (req, res) => {
    const { id } = req.params;
    let sql = "delete from registros where id = ?"
    db.query(sql, [id], (err, result) => { err ? console.log(err) : res.send(result) })
})


app.get("/locacionCamara/:id", (req, res) => {
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

app.get("/registros", (req, res) => {
    let sql = "SELECT registros.id, registros.responsable, registros.fecha_creacion, registros.fecha, registros.tipo, registros.descripcion, registros.id_camara, eventos.color from registros join eventos on registros.tipo = eventos.tipo order by fecha_creacion desc";
    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(result);
        }

    })
});

app.get("/locaciones", (req, res) => {
    let sql = "SELECT locacion from camara group by locacion";
    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(result);
        }

    })
});

app.post("/registrarEstados", (req, res) => {
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


app.get("/camaras", (req, res) => {
    let sql = `
    SELECT 
    C.id,
    C.locacion,
    E.nombre AS EstadoActual,
    E.color,
    H.fechaInicio AS FechaUltimoCambio
FROM 
    Camara C
    JOIN HistorialEstado H ON C.id = H.idCamara
    JOIN EstadoCamara E ON H.idEstadoCamara = E.id
WHERE 
    H.fechaInicio = (
        SELECT MAX(H2.fechaInicio)
        FROM HistorialEstado H2
        WHERE H2.idCamara = C.id
    )
ORDER BY 
    C.id;
    `;
    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: "Hubo un error en la consulta a la base de datos" });
        } else {
            res.send(result);
        }
    });
});


app.get("/tiposEventos", (req, res) => {
    let sql = "SELECT * from eventos";
    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(result);
        }

    })
});




app.get("/historialEstadoCamara/:idCamara", (req, res) => {
    const { idCamara } = req.params;

    let sql = `
    SELECT
    HE1.idCamara,
    EC1.nombre AS EstadoAnterior,
    EC2.nombre AS EstadoActual,
    HE1.fechaInicio AS FechaCambio
FROM 
    (SELECT 
        H.idCamara,
        H.idEstadoCamara,
        H.fechaInicio,
        LAG(H.idEstadoCamara) OVER (PARTITION BY H.idCamara ORDER BY H.fechaInicio) AS EstadoAnteriorId
    FROM 
        HistorialEstado H
    WHERE 
        H.idCamara = ?) AS HE1  -- Ajusta este número al ID de la cámara que desees consultar
JOIN EstadoCamara EC1 ON HE1.EstadoAnteriorId = EC1.id
JOIN EstadoCamara EC2 ON HE1.idEstadoCamara = EC2.id
WHERE 
    HE1.EstadoAnteriorId IS NOT NULL
ORDER BY 
    HE1.fechaInicio desc;
    `;
    
    db.query(sql, [idCamara], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Error al obtener el historial de la cámara" });
        } else {
            res.json(result);
        }
    });
});

app.get("/historialEstadoCamara", (req, res) => {

    let sql = `
    SELECT
    HE1.idCamara,
    EC1.nombre AS EstadoAnterior,
    EC2.nombre AS EstadoActual,
    HE1.fechaInicio AS FechaCambio
    FROM 
        (SELECT 
            H.idCamara,
            H.idEstadoCamara,
            H.fechaInicio,
            LAG(H.idEstadoCamara) OVER (PARTITION BY H.idCamara ORDER BY H.fechaInicio) AS EstadoAnteriorId
        FROM 
            HistorialEstado H) AS HE1
    JOIN EstadoCamara EC1 ON HE1.EstadoAnteriorId = EC1.id
    JOIN EstadoCamara EC2 ON HE1.idEstadoCamara = EC2.id
    WHERE 
        HE1.EstadoAnteriorId IS NOT NULL
    ORDER BY 
         HE1.fechaInicio desc;
    `;
    
    db.query(sql, (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Error al obtener el historial de las cámaras" });
        } else {
            res.json(result);
        }
    });
});



app.post("/actualizarEstadoCamara", (req, res) => {
    const { idCamara, nuevoEstadoId } = req.body;
    
    let sql = "INSERT INTO HistorialEstado (idCamara, idEstadoCamara, fechaInicio) VALUES (?, ?, NOW())";
    db.query(sql, [idCamara, nuevoEstadoId], (err, result) => {
        if (err) {
            res.status(500).json({ error: "Error al actualizar el estado de la cámara" });
        } else {
            res.status(200).json({ message: "Estado de la cámara actualizado correctamente" });
        }
    });
});



app.post("/registrarEstado", (req, res) => {
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



app.get("/actualizarRegistro/:id", (req, res) => {
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

app.get("/estados", (req, res) => {
    let sql = "select * from estadoCamara";
    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(result);
        }
    })
});

app.post("/crearCamara", (req, res) => {
    const camaras  = req.body;
    camaras.forEach(camara => {
        // Insertar en la tabla Camara
        let sqlCamara = "INSERT INTO Camara (id, locacion) VALUES (?, ?)";
        db.query(sqlCamara, [camara.id, camara.locacion], (err, resultCamara) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Error al crear las cámaras" });
            }

            let sqlEstado = "INSERT INTO HistorialEstado (idCamara, idEstadoCamara, fechaInicio) VALUES (?, ?, NOW())";
            db.query(sqlEstado, [camara.id, camara.estado], (err, resultEstado) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: "Error al establecer el estado de la cámara" });
                }
            });
        });
    });
    res.send("Camaras creadas correctamente");
});


app.get("/estadoActualCamara/:id", (req, res) => {
    const { id } = req.params;

    let sql = `
        SELECT 
            C.id AS CamaraID,
            C.locacion,
            E.nombreEstado AS EstadoActual,
            MAX(H.fechaInicio) AS FechaUltimoCambio
        FROM 
            HistorialEstado H
            JOIN Camara C ON H.idCamara = C.id
            JOIN EstadoCamara E ON H.idEstadoCamara = E.id
        WHERE 
            C.id = ?
        GROUP BY 
            C.id, C.locacion, E.nombreEstado
        ORDER BY 
            FechaUltimoCambio DESC
        LIMIT 1;
    `;


    console.log(id)

    db.query(sql, [id], (err, result) => {
        if (err) {
            res.status(500).json({ error: "Hubo un error en la consulta a la base de datos" });
        } else {
            if (result.length > 0) {
                console.log(result[0].EstadoActual, result[0].FechaUltimoCambio);
                res.send(result[0]);
            } else {
                res.status(404).json({ error: "No se encontró la cámara con el ID proporcionado" });
            }
        }
    });
});

app.post("/actualizarRegistro", (req, res) => {
    const { id } = req.body;
    const { tipo } = req.body;
    const { descripcion } = req.body;
    const { fecha } = req.body;
    const { id_camara } = req.body;
    const fecha_actual = moment().format('YYYY-MM-DD HH:mm:ss');

    //obtener el estado actual del registro y mandarlo al historial
    let estado_actual = "select * from registros where id = ?";
    db.query(estado_actual, [id], (err, result) => {
        if (err) {
            res.status(500).json({ error: "Hubo un error en la consulta a la base de datos" });
        } else {
            let actualizar_historial = "insert into historial (id_registro, tipo, fecha, fecha_modificacion, descripcion, id_camara) values (?,?,?,?,?,?)";
            db.query(actualizar_historial, [id, result[0].tipo, result[0].fecha, fecha_actual, result[0].descripcion, result[0].id_camara], (err, result) => {
                if (err) {
                    res.status(500).json({ error: "Hubo un error en la consulta a la base de datos" });
                } else {
                    let actualizar_estado_registro = "UPDATE registros SET fecha = ?, fecha_creacion = ?, tipo = ?, descripcion = ?, id_camara = ? WHERE id = ?";
                    db.query(actualizar_estado_registro, [fecha, fecha_actual, tipo, descripcion, id_camara, id], (err, result) => {
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

app.get("/historial/:id", (req, res) => {
    const id = req.params.id;

    let sql = "SELECT * from historial where id_registro = ? order by fecha_modificacion desc";
    db.query(sql, [id], (err, result) => {
        if (err) {
            res.status(500).json({ error: "Hubo un error en la consulta a la base de datos" });
        } else {
            res.send(result);
        }
    })
})
app.post("/guardarRegistro", (req, res) => {
    const { id_camara } = req.body;
    const { tipo } = req.body;
    const { fecha } = req.body;
    const { descripcion } = req.body
    const { responsable } = req.body;
    const fecha_actual = moment().format('YYYY-MM-DD HH:mm:ss');
    let sql = "insert into registros (responsable, fecha_creacion, tipo, fecha, descripcion, id_camara) values (?,?,?,?,?,?)";
    db.query(sql, [responsable, fecha_actual, tipo, fecha, descripcion, id_camara], (err, result) => {
        if (err) {
            res.status(500).json({ error: "Hubo un error en la consulta a la base de datos" });
        } else {
            res.send(result);
        }
    })
});

app.get("/registro/:id", (req, res) => {
    const { id } = req.params;

    let sql = `
        SELECT 
            R.id, 
            R.responsable, 
            R.fecha_creacion, 
            R.fecha, 
            R.tipo, 
            R.descripcion, 
            R.id_camara,
            T.color
        FROM 
            Registros R
            JOIN eventos T ON R.tipo = T.tipo
        WHERE 
            R.id = ?;
    `;
    
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Error al obtener el registro" });
        } else {
            if (result.length > 0) {
                res.json(result[0]);
            } else {
                res.status(404).json({ message: "Registro no encontrado" });
            }
        }
    });
});


app.put("/actualizarRegistro/:id", (req, res) => {
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



app.listen(3001, () =>
    console.log("Corriendo en 3001")
);


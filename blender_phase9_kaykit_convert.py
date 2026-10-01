import bpy, os, math
root=r'C:\Users\Admin\OneDrive\Documentos\Reino de Caludonia'
src=os.path.join(root,'phase9_kaykit_work')
out=os.path.join(root,'public','assets','equipment','phase9','kaykit')
os.makedirs(out,exist_ok=True)
files=['guerreiro_espada','guerreiro_escudo','arqueiro_arco','arqueiro_flecha','mago_cajado','mago_grimorio','druida_varinha','druida_totem']
for name in files:
 bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
 bpy.ops.import_scene.fbx(filepath=os.path.join(src,name+'.fbx'))
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 if not meshes: raise RuntimeError('sem mesh '+name)
 # preserve source geometry/materials; normalize object transforms and pivot at geometry center
 for o in meshes:
  o.select_set(True)
  bpy.context.view_layer.objects.active=o
  bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 # center collection at origin without changing proportions
 mins=[min((o.matrix_world @ v.co)[i] for o in meshes for v in o.data.vertices) for i in range(3)]
 maxs=[max((o.matrix_world @ v.co)[i] for o in meshes for v in o.data.vertices) for i in range(3)]
 center=[(mins[i]+maxs[i])/2 for i in range(3)]
 for o in meshes:
  o.location.x-=center[0];o.location.y-=center[1];o.location.z-=center[2]
 bpy.ops.export_scene.gltf(filepath=os.path.join(out,name+'.glb'),export_format='GLB',use_selection=False,export_apply=True)
 dims=[maxs[i]-mins[i] for i in range(3)]
 print('PHASE9_ASSET',name,'meshes',len(meshes),'dims',tuple(round(x,4) for x in dims),'bytes',os.path.getsize(os.path.join(out,name+'.glb')))
